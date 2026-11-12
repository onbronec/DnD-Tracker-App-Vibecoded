using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class IconProcessor {
    public static void Process(string inputPath, string outputPng, string outputIco) {
        using (Bitmap src = new Bitmap(inputPath)) {
            int cropSize = 680;
            int srcX = 511 - (cropSize / 2);
            int srcY = 507 - (cropSize / 2);

            using (Bitmap cropped = new Bitmap(cropSize, cropSize, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(cropped)) {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.DrawImage(src, new Rectangle(0, 0, cropSize, cropSize), new Rectangle(srcX, srcY, cropSize, cropSize), GraphicsUnit.Pixel);
                }

                BitmapData data = cropped.LockBits(new Rectangle(0, 0, cropSize, cropSize), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int stride = data.Stride;
                IntPtr scan0 = data.Scan0;

                bool[,] visited = new bool[cropSize, cropSize];
                Queue<Point> queue = new Queue<Point>();

                for (int x = 0; x < cropSize; x++) {
                    queue.Enqueue(new Point(x, 0));
                    queue.Enqueue(new Point(x, cropSize - 1));
                    visited[x, 0] = true;
                    visited[x, cropSize - 1] = true;
                }
                for (int y = 0; y < cropSize; y++) {
                    queue.Enqueue(new Point(0, y));
                    queue.Enqueue(new Point(cropSize - 1, y));
                    visited[0, y] = true;
                    visited[cropSize - 1, y] = true;
                }

                int[] dx = { 1, -1, 0, 0 };
                int[] dy = { 0, 0, 1, -1 };

                while (queue.Count > 0) {
                    Point pt = queue.Dequeue();
                    int px = pt.X;
                    int py = pt.Y;

                    IntPtr pAddr = new IntPtr(scan0.ToInt64() + (py * stride) + (px * 4));
                    byte b = Marshal.ReadByte(pAddr, 0);
                    byte gr = Marshal.ReadByte(pAddr, 1);
                    byte r = Marshal.ReadByte(pAddr, 2);

                    bool isBg = (r < 95 && gr < 85 && b < 95);

                    if (isBg) {
                        Marshal.WriteByte(pAddr, 3, 0); // Alpha = 0

                        for (int i = 0; i < 4; i++) {
                            int nx = px + dx[i];
                            int ny = py + dy[i];
                            if (nx >= 0 && nx < cropSize && ny >= 0 && ny < cropSize && !visited[nx, ny]) {
                                visited[nx, ny] = true;
                                queue.Enqueue(new Point(nx, ny));
                            }
                        }
                    }
                }

                cropped.UnlockBits(data);
                cropped.Save(outputPng, ImageFormat.Png);

                int[] sizes = { 16, 20, 24, 32, 40, 48, 64, 96, 128, 256 };
                List<byte[]> images = new List<byte[]>();

                foreach (int sz in sizes) {
                    using (Bitmap resized = new Bitmap(sz, sz, PixelFormat.Format32bppArgb)) {
                        using (Graphics g = Graphics.FromImage(resized)) {
                            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                            g.SmoothingMode = SmoothingMode.HighQuality;
                            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                            g.Clear(Color.Transparent);
                            g.DrawImage(cropped, 0, 0, sz, sz);
                        }
                        using (MemoryStream ms = new MemoryStream()) {
                            resized.Save(ms, ImageFormat.Png);
                            images.Add(ms.ToArray());
                        }
                    }
                }

                using (FileStream fs = File.Create(outputIco)) {
                    using (BinaryWriter bw = new BinaryWriter(fs)) {
                        bw.Write((ushort)0);
                        bw.Write((ushort)1);
                        bw.Write((ushort)images.Count);

                        int offset = 6 + (16 * images.Count);
                        for (int i = 0; i < images.Count; i++) {
                            int sz = sizes[i];
                            byte w = sz >= 256 ? (byte)0 : (byte)sz;
                            byte h = sz >= 256 ? (byte)0 : (byte)sz;

                            bw.Write(w);
                            bw.Write(h);
                            bw.Write((byte)0);
                            bw.Write((byte)0);
                            bw.Write((ushort)1);
                            bw.Write((ushort)32);
                            bw.Write((uint)images[i].Length);
                            bw.Write((uint)offset);

                            offset += images[i].Length;
                        }

                        for (int i = 0; i < images.Count; i++) {
                            bw.Write(images[i]);
                        }
                    }
                }
            }
        }
    }
}
