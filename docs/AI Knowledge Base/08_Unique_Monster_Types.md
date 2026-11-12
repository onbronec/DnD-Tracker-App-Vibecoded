# Hordes — Companies (Variant B: Independent Company HP)

**Status:** Playtest návrh univerzálního rulesetu; dosud není schválen jako trvalé systémové pravidlo.  
**System:** Epic D&D 5e / DnD Companion.  
**Princip:** Horda je **jediný monster záznam/statblock**, uvnitř kterého se na bojišti samostatně rozmísťují **Companies**. Každá Company má vlastní HP, pozici a podmínky, bez nutnosti hrát každou její bytost zvlášť. Počítá se s budoucím Horde visualem v DnD Companion; aktuální parser paralelní Company HP zatím automaticky nespravuje.

---

## 1. Definice

**Horde.** Horda je uskupení několika Companies se společným statblockem a společným initiative countem. Celkový počet, druh a velikost Companies uvádí konkrétní statblock.

**Company.** Jedna Company reprezentuje určený počet bytostí (např. pět Erinyes). V mechanice boje se považuje za **jednu samostatně cílitelnou část hordy (jako creature pro účely efektů)**: má vlastní místo, HP, pohyb, conditions, saving throws a možnost jednat. Companies **nejsou další monster záznamy**; všechny čerpají statistiky z jediného statblocku hordy.

**Žádný společný HP pool.** HP Companies se neslučují a damage se mezi nimi nepřelévá. Celkové HP hordy je jen součtem HP všech jejích Companies, nikoli další zdravotní lištou.

**Vyřazení.** Company na 0 HP je zničena/rozprášena a ihned se odstraní z bojiště. Její další tahy a útoky odpadnou. Horda je poražena, když nezbývá žádná aktivní Company, pokud konkrétní statblock neurčuje jinak.

## 2. Miniatury, footprint a positioning

- Každá Company má **vlastní token, miniaturu nebo společnou základnu**. Její přesná velikost/footprint je určena ve statblocku (pro pět Medium Erinyes v příkladu **Huge: 15 × 15 ft.**).
- Je možné použít i několik dekorativních miniatur uvnitř jedné základny. Tyto jednotlivé postavy ale **nejsou samostatnými herními jednotkami** a nepřidávají útoky, HP ani další cíle.
- Companies mají oddělené footprinty a nesmějí skončit pohyb na footprintu jiné Company. Pokud to statblock dovoluje, Company a nepřátelská jednotlivá bytost mohou sdílet prostor; konkrétní Company zůstává jediným cílem.
- Dosah melee útoků, ranged attack range a běžná line of sight se měří vůči footprintu Company podle běžných pravidel pro velké creatures.
- **Jednoduchý AoE test (doporučený):** AoE zasahuje Company tehdy, když zahrnuje **její středový bod / anchor marker**. Tento bod na bojišti vždy označ. Není třeba počítat překryté čtverečky nebo jednotlivé členy. Totéž platí ve 3D při letu.
- Pokud chce DM přesnější geometrii, může si před encounterem zvolit místo anchor markeru jinou jednotnou metodu. Během jednoho encounteru se způsob určení zásahu nemění.

**Proč anchor marker?** Brání paradoxu, kdy 5ft AoE jen lízne okraj čtyř obrovských bases a přesto by každé zasáhl jako plný útok. Je to vědomá, rychlá abstrakce.

## 3. Iniciativa, pohyb a útoky

- Všechny Companies jedné hordy jednají na **stejném initiative countu**; DM je může vyhodnotit v libovolném pořadí.
- **Každá aktivní Company má vlastní movement a jednu action.** Ve standardním Horde rulesetu může použít **jeden útok** ze společného statblocku, nebo běžnou alternativní akci (např. Dash, Disengage nebo Dodge). Nemá Multiattack, bonus action ani reaction, pokud to její statblock výslovně nepovoluje.
- Companies mohou útočit na **stejný cíl** nebo na různé cíle. Pro melee attack musí být právě útočící Company v dosahu; vzdálená Company nepřidává žádný damage ani útok navíc.
- Počet útoků se snižuje **automaticky** úmrtím, ztrátou přístupu k cíli nebo control efektem na konkrétní Company. **Nesnižuj navíc damage kategorie podle počtu zbývajících Companies.**
- Účinky, které se spouštějí na začátku či konci tahu creature, se vyhodnocují pro **každou Company zvlášť**, když je její tah v rámci společného initiative countu vyhodnocován.

## 4. Horde Damage Table — jeden hod za jeden Company attack

Pokud Company používá útok s tabulkou potřebného bonusu:

1. Zvol cíl a typ útoku.
2. Hoď **jeden d20 za jednu útočící Company** (při advantage/disadvantage použij dva d20 a vyber výsledek obvyklým způsobem).
3. Spočti **Required Bonus = target AC − výsledný hod d20**. Případný jiný bonus nebo postih k útoku upravuje výsledný hod před odečtením; bonusy z AC/cover zůstávají součástí target AC.
4. Najdi pásmo v tabulce daného útoku. Uděl uvedený damage. **Nižší pásma vyjadřují menší počet úspěšných úderů členů Company, nikoli zcela minulý attack.**
5. Tato procedura nahrazuje běžné vyhodnocení hit/miss: i nejnižší pásmo způsobí uvedený damage. Pro účely pravidel **"when hit"** jde o zásah, pokud damage není jinak zcela negován. Natural 1 automaticky nemíjí a natural 20 automaticky nekrituje; critical hit zde nevzniká, pokud to statblock zvlášť nestanoví.

**Příklad:** AC 24, hod d20 = 15 → Required Bonus +9. Z tabulky Longsword Saintbreakers použij pásmo **+9 až +12 (75 %)**. Pokud takto útočí tři Companies, každá provede vlastní hod a každá případně způsobí damage ze své tabulky; neházej jeden d20 za celou hordu.

**Důležité:** Čísla v tabulce jsou **damage jednoho Company attacku**, nikoliv celé hordy. Převod staré Horde tabulky na Company tabulku vyžaduje samostatný balance pass.

## 5. Area effects: damage za každou zasaženou Company

- Každá Company, jejíž anchor marker je uvnitř area of effect, je zasažena **samostatně**.
- Pro každou zasaženou Company vyhodnoť její **vlastní saving throw**, obrany a výsledný damage. Damage spellu/efektu hoď **jednou** a stejný hod použij pro všechny zasažené Companies (ledaže zdroj efektu výslovně vyžaduje jinak).
- Každé Company odečti její damage **z jejích vlastních HP**. Při totožném výsledku zranění je součet damage napříč hordou prostě **damage × počet zasažených Companies**.
- **Žádný další obecný "double AoE damage" trait.** Samostatné zasažení více Companies už požadované násobení vytváří.
- Ochrany a immunities se řeší individuálně. Například horda imunní na fire nedostane damage z Fireballu, ani když jsou v oblasti všechny Companies.

**Příklad:** Thunder AoE způsobí 100 damage při neúspěšném savu, 50 při úspěšném. Zasáhne tři Companies; dvě neuspějí, jedna uspěje. Jejich HP se změní o −100, −100 a −50, dohromady **250 HP**. Neodečítej těchto 250 HP z žádného společného poolu.

## 6. Single-target damage, overkill a healing

- Single-target útok nebo spell zasáhne **jednu vybranou Company**, ne všechny Companies v dosahu.
- **Overkill se nepřelévá:** pokud má Company 30 HP a dostane 130 damage od jednoho single-target attacku, zanikne pouze ona. Zbylých 100 damage nezasáhne sousední Company.
- Healing, temporary HP a jiné zisky HP aplikuj na **jednu zvolenou Company**, pokud efekt výslovně nezasahuje více cílů.
- Efekt, který zasahuje několik samostatných creatures, může za běžných podmínek cílit několik Companies; každá se počítá za jeden cíl.

## 7. Conditions, saves a forced movement

- Každá Company má vlastní conditions, saving throws a časování jejich konce. @Stunned, @Restrained, @Grappled, @Poisoned atd. na jedné Company se **automaticky nepřenášejí** na ostatní.
- Pokud efekt ovlivní více Companies, každá provede vlastní save (pokud efekt neurčuje jinak).
- Forced movement, teleportation, grapple a jiné poziční efekty se aplikují na **konkrétní zasaženou Company**. Pro účely size limits se používá její uvedená **mechanická velikost**, ne velikost jednotlivých členů uvnitř.
- Účinky omezující akce či movement vyřadí příslušné možnosti **jen pro dotčenou Company**. Zbylé Companies fungují normálně.
- Jednotlivé Medium členy Company nelze samostatně zvolit jako cíl pro běžné creature efekty; kdyby to bylo potřeba kvůli fikci (záchrana zajatce, oddělení postavy atd.), jde o ad hoc adjudikaci DM, ne o standardní útok na pátý HP pool.

## 8. Defensive resources a group abilities

- Pokud má Company defensive feature, například **Collective Resistance**, platí výhradně pro **tuto Company** a její vlastní HP / zdroje.
- Jediná Company nemůže bez explicitní schopnosti zaplatit svou obranou za jinou Company.
- Sdílené zdroje mezi Companies **nejsou výchozí**; mohou být zvláštní schopností konkrétní hordy.
- Pokud jsou všechny čtyři Companies zasaženy AoE, obrana jedné z nich nechrání další tři.

## 9. Co pravidla vědomě nedělají

- Žádné individuální HP, útoky, saving throws ani conditions každého člena pětičlenné Company.
- Žádná pevná globální sleva na damage podle procenta ztracených HP hordy.
- Žádné automatické čtyřnásobení jednoho single-target attacku.
- Žádné bezplatné AoE ×2 nad počet individuálně zasažených Companies.
- Žádný další centralizovaný resource, pokud ho konkrétní Horde nepotřebuje.

## 10. DnD Companion — plánovaný Horde visual

**Datový model (cílový stav):** Jeden `Monster` záznam představuje celou hordu. Uvnitř něj se sleduje seznam Companies: počet, mechanická velikost, členové, samostatné současně aktivní HP pooly, pozice, conditions a případná lokální omezení akcí. Horda používá jediný statblock a jeden initiative count. Součet HP Companies je pouze informační, není to další cílitelný HP pool.

**Současné omezení:** Autoritativní `01_Statblock_Template.md` nyní podporuje jeden HP tracker (případně sekvenční boss health bars), nikoli paralelní Company HP v jednom Monster objektu. Následující metadata jsou **návrh pro budoucí visual**, ne záruka fungujícího současného importu:

- `**Hit Points:** 750 per Company (4 independent pools; 3,000 HP in total)`
- `**Companies:** 4 (5 erinyes each; Huge 15-ft.-square footprint per Company)`

**Před implementací visualu:** DnD Companion musí rozpoznat paralelní Company HP a umět jednotlivé Companies cílit, ovlivňovat a vyřazovat. Do té doby může stávající aplikace zobrazit jen zjednodušené HP a interní stav Companies je nutné vést ručně. **Nevytvářej čtyři samostatné Monster statblocky** jako definici této varianty; starší workaround se čtyřmi instancemi už není zamýšlený finální model.

## 11. Balance checklist (pro jednotlivé hordy)

Při dokončení konkrétní hordy ověř:

- **DPR:** očekávané damage **jedné Company × počet Companies**, s ohledem na skutečnou dosažitelnost cílů, dosahy, cover a útoky na různé cíle.
- **Attrition:** když jedna Company padne, obvykle odpadne její další útok, což je silný důvod pro focus fire.
- **Durability:** součet všech Company HP plus všechny obrany, heal, prevence damage a resistances; není to automaticky stejné jako HP jednoho původního Horde statblocku.
- **AoE:** když se Companies seskupí, kolik jich může jedno AoE realisticky zasáhnout? Mohou se hráči snadno odměnit za vhodnou pozici?
- **Control:** je možnost vyřadit jednu Company přiměřeně silná? Nedokáže jeden slabý control efekt vypnout celou hordu?
- **Action economy:** každá Company má jeden útok/akci; po přidání reaction, special action či summons vše započti.
- **On-hit effects:** pokud damage tabulka vždy způsobuje alespoň minimální damage, počítej s častými "on hit" triggery.
- **Geometry:** před bojem vyznač anchor markery, footprint a to, zda se Companies mohou překrývat s ostatními creatures.

## 12. Worked example — Saintbreakers

Čtyři Companies po pěti Erinyes. Každá Company má 750 HP a jeden útok z původních Longsword/Longbow damage tables. Čtyři Companies tedy dohromady představují 20 Erinyes, **3 000 součtových HP** a až **čtyři útoky za kolo**, pokud všechny mohou jednat. Jde o **jeden** monster statblock s interními čtyřmi HP pooly, viz `Saintbreakers_Horde.md`.

**Status čísel:** Původní damage tabulky byly zachovány schválně, aby se ověřila hratelnost pravidel bez předčasného přebalancování. Čtyři Company attacks s původním damage za útok **nejsou automaticky vybalancované** proti původním třem Horde attacks. Výsledný Encounter Points / Expected DPR musí být po playtestu znovu zhodnocen.
