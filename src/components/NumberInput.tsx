import { type ChangeEvent, type InputHTMLAttributes, useEffect, useRef, useState } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { onCommit?: (value: number) => unknown };

export function NumberInput({ value, onChange, onCommit, onFocus, onBlur, onKeyDown, ...props }: Props) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const focused = useRef(false);
  const dirty = useRef(false);
  const latestValue = useRef(value);
  const revision = useRef(0);
  latestValue.current = value;

  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ''));
  }, [value]);

  function commit(input: HTMLInputElement, event: unknown) {
    if (!dirty.current && draft !== '') {
      setDraft(String(value ?? ''));
      return;
    }
    const normalized = draft === '' ? '0' : draft;
    input.value = normalized;
    setDraft(normalized);
    if (draft === '') onChange?.(event as ChangeEvent<HTMLInputElement>);
    const result = onCommit?.(Number(normalized));
    const committedRevision = revision.current;
    dirty.current = false;
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      Promise.resolve(result).then(() => {
        if (!focused.current && !dirty.current && revision.current === committedRevision) setDraft(String(latestValue.current ?? ''));
      });
    }
  }

  return <input {...props} type="number" value={draft}
    onFocus={event => { focused.current = true; onFocus?.(event); }}
    onChange={event => {
      dirty.current = true;
      revision.current += 1;
      setDraft(event.target.value);
      if (event.target.value !== '') onChange?.(event);
    }}
    onBlur={event => {
      focused.current = false;
      commit(event.currentTarget, event);
      onBlur?.(event);
    }}
    onKeyDown={event => {
      if (event.key === 'Enter') commit(event.currentTarget, event);
      onKeyDown?.(event);
    }}
  />;
}
