# AGENTS.md

Pokyny pro dalsi praci v teto slozce. Aplikace je osobni DnD Companion pro
domaci lokalni Wi-Fi, ne verejna webova sluzba. Optimalizuj proto pro rychlost
u stolu, citelnost pri session a spolehlivost dat pred "enterprise" slozitosti.

## Co je projekt

- Verejny nazev aplikace je `DnD Companion`.
- `src/` je React + TypeScript frontend. Hlavni moduly jsou pages,
  components, client socket helpery a shared typy.
- `server/` obsahuje serverovou domenu: migrace/autosave, permissions,
  visibility filtering, action reducer a Socket.io handlery.
- `server.js` je Node/Express + Socket.io entrypoint. Serviruje React build z
  `dist/`, nebo Vite dev frontend bezi vedle nej.
- `dnd-tracker.html` je legacy reference ze stare single-file verze. Neni uz
  podporovany runtime entrypoint.
- `dnd-tracker-autosave.json` je lokalni serverovy autosave se skutecnymi daty
  kampane. Je v `.gitignore`; nevypisuj jeho obsah do odpovedi, pokud to neni
  nutne.
- `README_MULTIPLAYER.md` popisuje soucasny zpusob provozu pres server.
  `README.md` ma casti ze starsi single-file verze a muze byt zastarale.
- `.claude/settings.local.json` jsou lokalni nastaveni asistenta; nesahej na ne,
  pokud o to uzivatel vyslovne nepozada.

## Spousteni a overeni

- Install/build vyzaduje nove frontend dependency: `npm.cmd install`.
- Dev mode: `npm.cmd run dev`.
- Build: `npm.cmd run build`.
- Start serveru: `npm.cmd start` nebo `node server.js`.
- DM view: `http://localhost:3000?mode=dm&token=<token>`.
- Player view: `http://<lokalni-ip>:3000?mode=player`.
- V PowerShellu pouzivej `npm.cmd`, protoze `npm` muze selhat na execution
  policy.
- Rychle kontroly:
  - `node --check server.js`
  - syntax inline skriptu v HTML pres `new Function(...)`, kdyz menis JS
  - validita autosave JSON bez vypisovani dat
- Git muze hlasit `unsafe repository`. Nemen globalni git config bez souhlasu
  uzivatele.

## Architektura a stav

- Zdroj pravdy za behu je `stateRef.current` v serveru. DM localStorage uz
  neni autoritativni.
- Frontend neposila cely snapshot. Posila serverem validovane `action:submit`
  akce a server vraci filtrovany stav pres `state:init`/`state:patch`.
- Bezna socket akce nesmi cekat na synchronni diskovy autosave. Pouzivej
  debounced save scheduler ze `server/store.js`; manualni Autosave tlacitko
  muze delat okamzity flush. Nevracej `fs.writeFileSync` celeho autosavu primo
  do hot path `action:submit` / undo / redo.
- Hlavni frontend promenne jsou `characters`, `combatState`, `monsterDatabase`,
  `itemDatabase` a aktualni vybery pro spells/monsters/inventory.
- `monsterDatabase` i `itemDatabase` jsou server state a ukladaji se do
  autosave.
- Historie je chronologicky `actionLog`, ale undo/redo je scoped podle page.
  Kazda reverzibilni akce ma page snapshot `before`/`after`.
- `actionLog.before/after` snapshoty jsou server-only data pro undo/redo. Nikdy
  je neposilej pres socket/API do browseru, ani DM klientovi; pouzij
  `stripHistorySnapshots()` / filtrovani visibility. Jinak DM payload naroste
  na desitky MB a kazdy klik ma sekundovou latenci.

## DM a player mode

- `?mode=dm&token=<token>` ma plnou kontrolu; bez spravneho tokenu server
  degradne klienta na player.
- Nespolehej jen na skryti tlacitek v UI. Server musi vynucovat, co smi player
  menit.
- Player muze menit HP/effects/spells/inventory hracskych postav. Nema ridit
  tok boje, mazat/pridavat entity, menit monstra ani videt skryta data.
- `filterStateForPlayers()` musi pri zmenach opravdu odstranit DM-only data,
  nejen je schovat ve view.

## Design a UX

- UI je prakticky utilitarni battle dashboard. Zachovej hustotu informaci,
  rychle akce a velke hit-targety.
- Soucasna paleta je tactical dark: tmave pozadi, tmave panely, jemne bordery,
  modra/cyan pro navigaci, zelena pro pozitivni akce, cervena pro destruktivni,
  zluta/oranzova pro tah/iniciativu, fialova pro specialni moduly.
- Globalni toolbelt je fixed/disconnected levy rail dostupny na kazde page.
  Hrace vidi jen player-safe nastroje, DM-only veci schovej. Dice roller je
  dostupny DM i playerum. Toolbelt buttons maji byt vizualne rozlisene podle
  nastroje, ne samey.
- Dice roller umi vyrazy typu `4d4+7d6+10`, log jednotlivych kostek,
  advantage/disadvantage a jednorazovy reroll prirozenych 1. Poslednich 5 hodu
  per connected actor ukladej do autosave v `state.toolbelt.diceRolls`.
  Advantage/disadvantage v generic rolleru aplikuj konzistentne na kazdou kostku.
- DM toolbelt obsahuje Party Checks, Improv, Stealth, World Calendar a Notepad.
  Calendar records a notepad notes jsou Markdown a patri do autosave. World
  Calendar je earth-like grid calendar; rok 502 after event mapuj na Gregorian
  2025, aby 23. prosinec byl Tuesday a 24. prosinec Wednesday.
- Primarni pracovni obsah nech otevreny. Sekundarni setup/import/add/edit
  ovladani schovavej do expand/collapse UI. Pokud je vic souvisejicich panelu
  vedle sebe, pouzij horizontalni `CollapsiblePanelGroup` a nech otevreny max
  jeden panel.
- Karty postav/monster jsou primarni pracovni jednotka. Pri zmenach hlidej:
  HP/current/max, temp HP, AC, iniciativa, effects, power, a tlacitka pro rychle
  damage/heal.
- Monster database entries jsou strukturovana data, ne jen statblock text:
  `stats`, `saves`, HP/AC/speed/meta, `defensiveFeatures`, `features`,
  `actions`, `bonusActions`, `reactions`, `legendaryActionEntries`,
  `lairActions`, `mythicActions` a `monsterAbilities`.
- Monster editor musi podporovat ruční editaci i paste/import Markdown
  statblocku pres `parseMonsterMarkdown()`. Import je vzdy parse -> user edit
  -> save, ne blind overwrite bez kontroly.
- Monster tracker zobrazuje a serverove trackuje `monsterAbilities.power`,
  `customFeatures`, `legendaryActions`, `epicActions`, monster spell slots a
  per-day spells. Legendary a epic action uses se resetuji serverove pri startu
  tahu monstra; nedelat reset jen lokálně ve frontendu.
- Lair/mythic actions jsou opt-in. Pri pridani monstra z databaze mohou vytvorit
  samostatny initiative placeholder na count 20 s popisem prislusnych akci.
- Monster spellcasting drzi spelly a sloty na jednom miste v monster trackeru.
  Spell names v popisech zobrazuj jako Markdown reference na spell database,
  kdyz je to mozne.
- Page scope `spells` je v UI pojmenovany Character Sheets. Zustava jako
  `spells` kvuli socket/history kompatibilite.
- Spell database je sesta databaze ve state (`spellDatabase`, schema v4).
  DM ji muze editovat/importovat, players ji vidi a mohou z ni pridavat known
  spells do player character spellbooku. Manual import z lokalniho exportu jde
  pres `database.spell.importFromDataFolder`, cte newest nested ZIP/CSV z
  `data/Spells` a `data/` patri do `.gitignore`.
- Character spellbook (`character.spellbook`) drzi `knownSpellIds`,
  `preparedSpellIds`, `preparesSpells`, `preparedNonEpicMax`,
  `preparedEpicMax`. Cantripy jsou vzdy aktivni, levely 1-9 pocitej do
  non-epic prepared limitu, Epic 1-3 do epic limitu, special sekce maji
  vlastni prepared toggle bez limitu.
- Character Abilities (`character.characterAbilities`) jsou spodní wiki sekce
  character sheetu: libovolny pocet `{id,name,description,source}` entries.
  Jsou ciste popisne Markdown poznamky pro class/item/feature vysvetlivky a
  nemaji mechanicky menit stav. Nemíchat s `customFeatures`, ktere trackuji
  pouziti/rest recovery.
- Character sheet fields: `abilityScores`, `proficiencyBonus`,
  `savingThrowProficiencies`, `skillProficiencies`, `skillExpertise`. Dodrzuj
  5e ability/skill seznamy; PC scores mohou byt do 30 a proficiency bonus do
  10.
- Character Sheets maji levy dynamicky index obsahovych sekci. Udrzuj `id`
  anchor sekce a aktivni stav podle scrollu, ale frozen top Character header
  do indexu nedavej.
- DM Party Checks patri do globalniho leveho toolbeltu. Ma porovnavat jeden
  save/check/skill napric vsemi player characters, ne ukazovat jen detail
  vybrane postavy. Pouzivej jen aktivni player combatants. DC pole ukazuje
  sanci na uspech; natural 1 vzdy fail, natural 20 vzdy success. Zachovej
  Crow/Astria aura checkboxy a normal/advantage/disadvantage vypocet sanci.
  Crow aura pouziva Wisdom modifier, Astria aura Intelligence modifier.
  Inspiration je per-character d12/d20; u ability/skill checks se inspiration
  die roluje s advantage, u saves ne. Funyana dostava half proficiency rounded
  down na ability/skill checks, kde neni proficient ani expert.
- Stealth tool uklada/zobrazuje base check bez globalniho Pass without Trace;
  Pass without Trace +10 aplikuj dynamicky pri vyhodnoceni, aby toggle hned
  zmenil success/failure.
- Notepad rad podle note date descending, newest first; timestamp pouzij jako
  tie-breaker.
- Prvni/header sekce kazde page ma mit `page-sticky-section`, aby zustala
  dostupna pri scrollovani. Plati i pro normalni Inventory header se selectem
  postavy.
- Ability Score Set/Increased/Reduced jsou docasne conditions. Ovlivnuji
  vypocet sheetu pres effects, ale base hodnoty v editoru se nemeni.
- Conditions se vizualne lisi podle `kind`: buff/debuff/neutral. V combat
  trackeru maji zobrazit ulozeny popis pri hoveru.
- Klik na jednoduchou condition ji rovnou odstrani. Management modal otevirat
  jen pro conditions s levely, ability-score vazbou nebo dice/damage metadaty.
- Dice/damage conditions pouzivaji effect pole `diceCount`, `diceSides` a
  `damageType`; condition database muze mit defaulty `defaultDiceCount`,
  `defaultDiceSides`, `defaultDamageType`. Text ma vypadat napr.
  `Burning 2d4 fire`.
- Search UI pro conditions, monster databazi a inventory databaze ma byt
  dynamicky result-list/card picker (`SearchPicker`), ne dvojice text input +
  resetujici se `select`.
- Inventory radky maji byt kompaktni souhrny bez opakovanych kategorickych
  labelu typu Potion/Scroll/General note; sekce uz kategorii ukazuje.
  Remove/transfer/attune ovladani patri do item detail modalu, ne stale na
  radek.
- Item detail modal se renderuje pres portal do `document.body`, aby byl vzdy
  centrovany v cele obrazovce a prekryl i history panel.
- Inventory itemy musi jit editovat pres serverovou akci `inventory.item.update`;
  editace textu nesmi byt jen lokalni stav.
- General inventory items jsou volne poznamky pro nalezy, knihy, deniky a stopy;
  nepremenuj je na prilis striktni item schema.
- Dlouhe texty itemu, potions, conditions, monster statblocku, ability notes a
  dalsich popisnych poli ber standardne jako Markdown. Editor ma mit citelne
  popisky tlacitek (Bold, Italic, Header...) a oddelene Preview/Pop out akce.
  Renderuj pres React node renderer, ne pres raw `innerHTML`, pokud k tomu neni
  silny duvod.
- Markdown texty podporuji databazove reference na Conditions, Spells a
  Monsters. Pouzivej `@Stunned` pro jednoduche nazvy a `@[Accursed Wish]` pro
  vic slov / slozitou interpunkci. Reference renderuj jako klikaci React node,
  ktery otevre centered detail modal; nikdy kvuli tomu neprechazej na raw HTML.
- Automaticke doplneni techto odkazu do spell databaze resi
  `npm.cmd run link:spell-refs`. Default je dry-run. Pro zapis do autosavu
  pouzij `npm.cmd run link:spell-refs -- --apply`; script pred zapisem dela
  timestamped `.bak` backup. Matching je phrase/word-boundary nad originalnim
  textem, bez stripovani mezer, aby napr. `poi soned` nematchovalo `Poisoned`.
- Klavesove zkratky zachovej: Space/PageUp dalsi tah, PageDown predchozi tah,
  Backspace undo aktualni stranky, Shift+Backspace redo. Ignoruj je v inputech,
  selectech, textareach a otevrenych modalech.
- Player view ma byt citelny na tabletu/telefonu. Testuj uzke viewporty, aby
  se tlacitka a inputy nelamaly pres sebe.
- Vyhni se marketingovemu "landing page" stylu. Prvni obrazovka ma zustat
  pouzitelny tracker.

## Kodovy styl

- Preferuj male, lokalni zmeny. Velky rewrite na framework nedelej bez
  vyslovneho zadani.
- Pokud pridavas nove pole postavy, uprav vsechny relevantni cesty:
  vytvoreni postavy, import/export, autosave, localStorage migraci, sync,
  undo/redo a render.
- Ukladani/import musi byt zpetne kompatibilni se starsimi JSON soubory.
- Pri renderovani user/import textu do `innerHTML` nejdriv mysli na escapovani.
  Statblocky, itemy a jmena mohou pochazet z ciziho textu.
- React komponenty maji drzet rozepsane inputy lokalne a posilat akci az pri
  explicitnim potvrzeni nebo blur/submit. Prichozi server patch nesmi mazat
  drafty.
- Komentare pis stridme, hlavne u komplikovane synchronizace, migraci a
  pravidel DnD/domacich mechanik.

## Data a bezpecnost

- Aplikace je urcena pro duveryhodnou domaci sit. Neber `?mode=dm` jako
  autentizaci.
- Pred riskantni upravou datoveho modelu doporuc uzivateli zalohu
  `dnd-tracker-autosave.json` nebo export z UI.
- Necommituj autosave, node_modules ani osobni exporty kampane.
- Pro verejny internet by bylo nutne pridat autentizaci, HTTPS, opravdova
  opravneni a lepsi filtraci DM dat.

## Prioritni veci ke zlepseni

- Dodelat parity funkce ze stareho HTML, ktere nebyly v prvni React migraci
  kompletne prenesene: statblock parser, JSON import/export UI, detailni
  monster ability editor a pokrocile effect level controls.
- Po instalaci dependency udrzovat passing `npm.cmd run build`, `npm.cmd test`
  a `npm.cmd run test:e2e`.
