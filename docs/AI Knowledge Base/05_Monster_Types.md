# Monster Types — Epic D&D Monster Design

**Účel dokumentu:** Pracovní příručka pro navrhování šesti funkčních archetypů monster v Epic D&D kampani: **Monster, Controller, Spellcaster, Leader, Ranged, Elite**. Obsahuje popis role, designové instrukce, přepoužitelné ability patterns, counterplay a kontrolní otázky pro balanc.

**Status:** Designový toolkit, nikoli nové univerzální systémové pravidlo. Příklady schopností jsou **návrhové vzory**, ne automaticky vybalancované hotové statblocky. Konkrétní čísla, zdroje, timing a efekty se vždy upravují pro dané monstrum.

**Návaznost na projekt:** `00_Epic_System_Rules.md`, `01_Statblock_Template.md`, `02_Reference_Monsters.md`, `03_Reusable_Chassis.md`, `04_Setting_and_Factions.md` a `06_Non_Monster_Entities.md`. Číselné, formátovací a kosmologické konvence těchto dokumentů mají přednost.

---

## 1. Co znamená „typ monstra“

Typ určuje **primární taktickou funkci monstra v encounteru** a otázku, kterou klade hráčům. Není to jeho creature type, frakce, CR, power tier ani povinný soubor schopností.

| Typ | Ústřední taktická otázka | Primární přínos do encounteru | Hlavní slabina / counterplay |
| --- | --- | --- | --- |
| **Monster** | Jak se s ním efektivně vypořádáme? | Předvídatelný základní tlak a damage; drží tempo boje | Obvykle jednoduchý vzorec boje, omezené taktické možnosti |
| **Controller** | Jak získáme zpět kontrolu nad vlastními akcemi a pozicí? | Omezení movementu, positioning, cílení a dostupných akcí | Zrušení controlu, vyřazení držitele, změna pozice či taktiky |
| **Spellcaster** | Jak prosadíme svou magii navzdory nepřátelskému mágovi? | Spelly, counterspelly, magie jako střet zdrojů a reakcí | Line of sight, tlak na reakce/zdroje, útok na koncentraci, closing |
| **Leader** | Jak rozbijeme koordinaci a synergie nepřátel? | Posílení spojenců, povely, mimořádné skupinové akce | Isolace, oddělení a odstranění vůdce, přerušení buffů |
| **Ranged** | Jak překonáme vzdálenost a nevýhodné palebné úhly? | Vysoká hrozba na dálku, pressure na movement a cover | Closing, cover, breaking line of sight, uzavření přístupů |
| **Elite** | Jak zvládneme soupeře, který je nebezpečný i těžko neutralizovatelný? | Důvěryhodný damage **a** aktivní odpověď na magii | Vyčerpání obranných zdrojů, kombinované taktiky, forcing choices |

### Pravidla klasifikace

1. Každé monstrum má **jeden primární typ**. Může mít vedlejší roli (např. *Controller / Tank* nebo *Leader / Ranged*), ale musí být poznat, co je jeho hlavní práce.
2. **Monster** je plnohodnotný základní archetyp, ne označení pro špatně navržené nebo slabé monstrum.
3. **Elite neznamená automaticky více encounter points.** Je to profil všestranné hrozby: dobře zraňuje a současně se cíleně brání magii. Dvoubodové Elite může existovat; osmibodový boss nemusí být Elite.
4. **Tank** je bojová funkce, nikoli sedmý samostatný typ. Může být Monster (odolný frontliner), Controller (Grapple / intercept), Leader (chrání formaci) nebo Elite (odolává přímým i magickým hrozbám).
5. **Spellcaster** se pozná hlavně podle využívání skutečných spellů a práce s counterspelly. **Elite** nemusí umět castit vůbec; jeho antimagic může být fyzické, vrozené nebo založené na obranném resource.
6. Ne každý control efekt dělá z monstra Controllera: jednoduchý push na basic melee úderu může být podpůrný prvek Monstera.
7. Ne každý ranged attack dělá z monstra Ranged: Ranged musí hráče opravdu přinutit řešit vzdálenost.

### Společný designový postup

1. **Combat fantasy:** Jak má monstrum působit? Co mají hráči cítit a jaké rozhodnutí mají udělat?
2. **Primární typ:** Vyber jednu nejdůležitější funkci a **konkrétní otázku** pro hráče.
3. **1–3 defining mechanics:** Vyber několik silných nosných principů; základní útoky, pohyb, reakce a utility je mohou podporovat bez umělého limitu počtu položek.
4. **Taktické varianty:** Monstrum by ideálně mělo mít důvod volit mezi dvěma různými akcemi nebo mezi útokem a obranou, ne jen neustále opakovat nejlepší DPR sekvenci.
5. **Counterplay:** Urči, co hráči mohou udělat *před* efektem, *po* něm a jak mohou zabránit opakování.
6. **Power budget:** Započti nejen vlastní útoky, ale také granted attacks, counterspelly, negace damage, condition denial, healing, repositioning a součinnost s jinými monstry.
7. **Failure case:** Pokud protivníci obejdou hlavní mechaniku, zůstane monstrum hratelné a věrohodné? Pokud mechanika funguje dokonale, nemůže encounter zablokovat?

### Orientační epic kalibrace

- **1 encounter point:** přibližně **150 listed HP** a **80–100 DPR** jako orientační profil; není to cena za každou kategorii.
- **DC:** přibližně **19** slabší nepřítel, **24** běžná epic hrozba, **27** silný boss.
- **Attack bonus:** zhruba **+12** slabší, **+16** běžný, **+20** silný boss.
- Silný control, buff více spojenců, extra turns, counterspell dominance, resurrection, full damage prevention a velké AoE **spotřebovávají tentýž power budget** jako HP a damage.
- Počítej **expected damage po pravděpodobnosti zásahu a úspěšnosti save**, nikoli jen damage on hit. Započti off-turn útoky, bonus actions, movement damage, damage allyů přidělený Leaderem a damage multiplier u Epic damage typů.
- **Arcane, Righteous a Vile** damage řeš podle kosmologických pravidel projektu (včetně případného zdvojení konkrétní damage složky proti Imateria-Tainted / Creation-Bound), nikoli podle morálky nebo role.
- Preferuj **jeden centrální resource**, pokud má monstrum cenu za útok i obranu. Pro každý pool v hotovém statblocku definuj start, maximum, gain, spend, reset a interakci s 0 HP.
- Všechny „1/Turn“, „1/Round“, reakce, extra turns a triggered effects musí mít explicitní timing. Přidaná akce či útok allyů nejsou zdarma pro balance jen proto, že je provádí někdo jiný.

### Společná taxonomie counterplay

- **Avoid:** správná pozice, spacing, cover, jiná cesta, útok mimo dosah.
- **Disrupt:** přerušení koncentrace, vyčerpání reakce, push, silence, odhození zbraně či focusu.
- **Escape:** break grapple, úspěšný save, teleportace, akce spojence na osvobození.
- **Exhaust:** vynucení obranného resource, bait reakcí, vyvolání volby mezi útokem a obranou.
- **Destroy:** odstranění monstra, banneru, štítu, spoutávajícího objektu nebo podpůrného spojence.
- **Accept and adapt:** hráč může přijmout částečný postih a změnit plán; dobrý soft control nemusí být vždy odstraněn.

**Poznámka ke vzorovým mechanikám níže:** Anglické popisy jsou zkrácené **ability templates**. Symboly `[DC]`, `[damage]`, `[range]` a `[resource]` se dosadí až pro konkrétní statblock. Nejsou to oficiální definice podmínek ani automatická pravidla celé kampaně. Pokud mechanic používá spell/condition vyžadující další definici, výsledek musí být ve finálním statblocku jednoznačný.

---

## 2. MONSTER — základní bojová hrozba

### Identita a fantasy

**Monster** je spolehlivý bojovník, který vytváří základní nebezpečí encounteru skrze útoky, přítomnost a jednoduché bojové chování. Nemusí být nudný: jedna dobře zvolená mechanika mu dá jasnou osobnost. Nemá ale rozdělovat pozornost mezi mnoho subsystémů.

**Pocit hráčů:** „Tohle monstrum nás zraní, pokud ho nevyřešíme; můžeme předvídat jeho styl a takticky jej porazit.“

### Typický profil

- **Offense:** konzistentní melee/ranged útoky; 1 silnější varianta místo pouhého Multiattacku.
- **Defense:** běžné AC/HP, případně jednoduchý defensive trait; nemá automaticky mít univerzální negate-damage pool.
- **Mobility:** taková, aby se dostalo do svého zamýšleného dosahu.
- **Action economy:** většinou standardní jeden tah; minimalizovat bezplatné off-turn damage.
- **Komplexita:** obvykle 0–1 defining mechanic, několik podpůrných akcí; pro chumpy může identitu nést frakční systém.
- **Encounter role:** frontline pressure, flanker, bruiser, skirmisher, expendable minion nebo jednoduchý ranged harasser, aniž by automaticky přecházel do jiného typu.

### Designové instrukce

1. Dej mu **spolehlivou cestu k poškození**; nemusí to být nejlepší DPR v encounteru.
2. Přidej **jednu taktickou odlišnost**: charge, stance, cleave, hit-and-run, shield bash či krevní instinkt.
3. Vyhni se tomu, aby každá rána automaticky způsobovala další status, damage over time a pohyb. Jedna výrazná volba je lepší.
4. Pokud jde o početné miniony, investuj komplexitu spíše do **warband / faction mechanic** než do jednotlivých statblocků.
5. Nezvyšuj HP jen proto, aby boj vydržel déle; zvaž, zda monstrum potřebuje mobility nebo smysluplnou druhou akci.

### Přepoužitelné ability patterns

**1. Crushing Charge — alternative action.** `The monster moves up to its speed in a straight line toward a creature and makes one melee attack. On a hit, the attack deals [bonus damage] and pushes the target 10 feet.`  
*Účel:* silný úvodní kontakt namísto plného Multiattacku. *Counterplay:* překážky, positioning, útok z boku. *Balanc:* charge nesmí zároveň zdarma provést plný Multiattack.

**2. Guarded Assault — offense/defense choice.** `When the monster takes the Multiattack action, it may forgo one attack to gain +2 AC until the start of its next turn.`  
*Účel:* srozumitelná volba mezi DPR a výdrží. *Counterplay:* útoky na saves, obejití.

**3. Cleaving Swing — alternate attack.** `The monster replaces one melee attack with a sweeping strike against two creatures within its reach. Make one attack roll against each target; each hit deals [reduced damage].`  
*Účel:* trestá semknutí bez pasivního splash damage navíc. *Counterplay:* spacing.

**4. Blood in the Water (1/Turn).** `When the monster hits a creature that is below half its hit point maximum, it deals [bonus damage] to that creature.`  
*Účel:* jednoduchý finisher. *Counterplay:* healing, focus fire na monstrum. *Balanc:* bonus damage musí být započítán v očekávaném DPR, ne přidaný „zdarma“.

**5. Relentless Advance — movement utility.** `As a bonus action, the monster moves up to half its speed toward a hostile creature it can see. This movement provokes opportunity attacks normally.`  
*Účel:* udržuje melee pressure bez dalšího damage. *Counterplay:* spacing, reakce, terén.

**6. Hold Ground — positional defense.** `While standing on solid ground, the monster has advantage on ability checks and saving throws made to resist being pushed, pulled, or knocked Prone.`  
*Účel:* frontliner, který nepřepustí pozici. *Counterplay:* teleportace, saving throws jiné povahy, obcházení.

**7. Vicious Opening (1/Turn).** `If the monster hits the same creature with two attacks during its Multiattack, its final hit against that creature deals [bonus damage].`  
*Účel:* lehký důvod pro focus fire; *balanc:* vyhodnotit frekvenci dvou zásahů, nepřidávat další attack.

### Typické chyby

- „Basic“ znamená jen HP + nezajímavý Multiattack, přestože malá taktická volba by pomohla.
- Nevýznamný melee combatant bez mobility se k hráčům vůbec nedostane.
- Každý útok současně pushuje, oslepuje, debuffuje a přidává damage; jednoduchá jednotka se změnila v přeplněný Controller.
- Přesunutí komplexity na stovky jednotlivých chumpů místo jednoduchého frakčního pravidla.

**Projektové precedenty:** *Gruumsh Battle Cultist* a *Zealot* — jednoduché individuální statblocky, které mohou čerpat sílu z širšího encounter systému.

---

## 3. CONTROLLER — kontrola prostoru, akcí a rozhodování

### Identita a fantasy

**Controller** je monstrum, které hráčům především **brání provádět zamýšlenou taktiku**: rozbije positioning, zadrží nebezpečný cíl, znemožní útěk, přeruší casting nebo omezí výběr cíle. Nemusí castit spelly; jeho control může být plně fyzický.

**Pocit hráčů:** „Nemůžeme se prostě postavit, kam chceme, a provést optimální akci. Musíme nejprve vyřešit tohle monstrum a jeho omezení.“

### Pět subtypů

| Subtyp | Hlavní nástroj | Výsledná hrozba |
| --- | --- | --- |
| **Grappler** | Grapple, Restrained, hold, throw | Izoluje a používá jednotlivce jako živou zbraň |
| **Sentinel** | Reach, reactions, movement stop | Vytváří oblast, kterou nelze beztrestně projít |
| **Disruptor** | Disarm, silence, blind, interrupt | Zakazuje vybrané akce a rozbíjí plán |
| **Juggernaut** | Push, trample, terrain destruction | Přetváří bojiště a rozbíjí formace |
| **Warden** | Anchor, chain, isolation, anti-teleport | Omezuje svobodu pohybu a záchrany spojenců |

### Sedm os controlu

1. **Position:** kde cíl skončí (push, pull, throw, forced teleport, separation).
2. **Movement:** jak se může pohybovat (Grappled, slow, stop, anchoring, pursuit).
3. **Actions:** co smí dělat (disarm, reaction denial, omezení spell components).
4. **Targeting:** koho může bezpečně napadnout (interception, mark, retaliation, cover).
5. **Senses:** co vidí/slyší a které schopnosti vyžadují percepci (Blinded, Deafened, smoke).
6. **Battlefield:** jak vypadá prostor (barricades, hazards, chokepoints, difficult terrain).
7. **Tempo / formation:** kdy může jednat a zda může spolupracovat (interrupt, binding, isolation, forcing choices).

**Soft control** znevýhodní volbu (slow, difficult terrain, disadvantage). **Selective hard control** ji dočasně zavře (Grapple, Silence určitých komponent, Stop Movement). **Total denial** (Stunned, Paralyzed, Incapacitated) je nejsilnější a nejméně interaktivní; používej sporadicky, s výrazným telegraphem, cenou či možností záchrany.

### Designové instrukce

1. Vyber **jednu hlavní osu** a nanejvýš jednu podpůrnou; neuděluj všechny kondice jedním monstrem.
2. Preferuj **physical cause → visible problem → escape route**: sevření, řetěz, hrozící kladivo, blokované dveře.
3. Silný control ať zpravidla zabere **útok, action, bonus action, reaction, koncentraci, volnou ruku nebo resource**.
4. U každého efektu definuj velikost cíle, saving throw/check/attack, dosah, délku trvání, escape DC, opakovaný save a přesné podmínky konce.
5. **Grappled ani Restrained běžně neblokují verbal/somatic spell components.** Chceš-li takový efekt, napiš jej samostatně a jednoznačně.
6. Controller by měl mít **dostatečný základní útok**, aby nebyl bezmocný, když hráči jeho specialitu obejdou.
7. Trestání movementu a útoků se snadno násobí při více reakcích; sleduj damage a control za **celé kolo**, ne jen během vlastního tahu.

### Přepoužitelné ability patterns

**1. Pinning Claw — Grappler.** `On a hit against a Large or smaller creature, the target is Grappled (escape DC [DC]). While Grappled this way, it is also Restrained. The monster can restrain only one creature this way at a time.`  
*Účel:* akční otázka „koho zachránit?“. *Counterplay:* escape, forced movement, teleportace, odstranění monstra. *Cena:* vysoká i bez bonus damage; Grapple + Restrained při běžném hitu je silné.

**2. Violent Hurl — bonus action, 1 [resource].** `The monster throws one creature it is Grappling up to 40 feet to a space on the ground, ending the Grapple. The thrown creature takes [damage] and falls Prone. If it collides with another creature, that creature makes a DC [DC] Dexterity saving throw, taking [damage] and falling Prone on a failure.`  
*Účel:* positioning + payoff; *counterplay:* zrušení Grapple, nevytvářet linie pro collision. *Cena:* poškození obou cílů a bonus action se započítávají.

**3. Iron Sentinel — reaction.** `When a creature within the monster's reach willingly moves out of that reach, the monster makes one melee attack against it. On a hit, the target's speed becomes 0 for the remainder of the turn.`  
*Účel:* kontrola chokepointu. *Counterplay:* Disengage, teleportace, attack from range, bait reaction. *Balanc:* kombinace s dalšími reakcemi může uzavřít celé bojiště.

**4. Anchor to Earth — on-hit, 1/Turn.** `On a hit, the monster anchors a creature to its current space until the start of the monster's next turn. The target can move within 15 feet of that space, but cannot willingly move beyond that distance unless it succeeds on a DC [DC] Strength saving throw when it tries.`  
*Účel:* omezení prostoru bez úplného zamčení movementu. *Counterplay:* zůstat uvnitř radiusu, překonat save, přerušit zdroj ankory. *Vyjasni:* zda teleportace omezení obchází.

**5. Crush the Windpipe — selective antispell.** `As an action, the monster forces one creature it is Grappling to make a DC [DC] Constitution saving throw. On a failure, the target cannot provide verbal components until the end of its next turn or until the Grapple ends, whichever occurs first.`  
*Účel:* fyzický Magebreaker bez všeobecného zákazu magie. *Counterplay:* únik, ally rescue, somatic-only spells. *Balanc:* silnější než obyčejná kondice, protože může vypnout klíčové spelly.

**6. Disarming Blow — replaces one attack.** `On a hit, the target makes a DC [DC] Strength saving throw or drops one object it is holding in a space within 5 feet of it chosen by the monster.`  
*Účel:* přesměrování pozornosti a změna výběru zbraně. *Counterplay:* backup weapon, retrieval, nespoléhat na jeden item. *Vyjasni:* interakci s pevně drženými či magicky připoutanými předměty.

**7. Wingbreaker — alternative action.** `Each hostile creature of the monster's choice within 20 feet makes a DC [DC] Strength saving throw. On a failure, the creature is pushed up to 30 feet in a direction the monster chooses and cannot take Reactions until the end of its next turn. The monster may then fly up to half its flying speed.`  
*Účel:* rozbití formace. *Cena:* nahrazuje Multiattack, obzvlášť silné v blízkosti hazards.

**8. Interpose — tank reaction.** `When a creature within 10 feet of the monster is targeted by an attack roll, the monster becomes the target instead, provided it is a legal target. Use the original attack roll against the monster's AC.`  
*Účel:* tank jako aktivní ochrana spojence. *Counterplay:* další útoky v tomtéž kole, oddělení, AoE/saves, bait reaction.

**9. Crushing Advance — Juggernaut action.** `The monster moves up to its speed through spaces occupied by Large or smaller hostile creatures. Each such creature makes a DC [DC] Strength saving throw. On a failure, it is pushed into an adjacent unoccupied space chosen by the monster and knocked Prone.`  
*Účel:* rozbití linií. *Cena:* jako samostatná akce; **nepřidávej bezmyšlenkovitě automatický movement damage**.

### Typické chyby

- Stun-lock bez možnosti spoluhráčů zasáhnout.
- Grapple + Restrained + Silence + stun na jediném standardním zásahu.
- Kontrola bez escape rules nebo bez ukončení při odstranění zdroje.
- Extra reactions, které generují skrytý obrovský off-turn DPR.
- Controller bez efektu, pokud hráči drží rozestupy, ale také bez základního bojového plánu.

**Projektový příklad:** *Sivak Draconian* jako **Controller / Tank** — Claw Grapple + Restrained, hod zajatce za resource, dočasné HP + Interpose pro ochranu spojenců. Tento příklad ukazuje propojení dvou rozhodnutí: **držet/odhodit cíl** a **útočit/chránit**.

---

## 4. SPELLCASTER — mág a counterspell specialista

### Identita a fantasy

**Spellcaster** používá skutečné spelly jako hlavní jazyk boje. Jeho výjimečnost v Epic encounteru je především schopnost **vést magický souboj**: reagovat na hráčské spelly, counterovat je, vytvářet hrozbu na dálku a donutit hráče měnit pořadí a načasování castění.

**Pocit hráčů:** „Musíme přemýšlet, jak naše klíčové spelly skutečně prosadit, a kdy stojí za to vynutit protihráčovu reakci.“

### Podtypy

- **Duelist:** specialist na counterspells, dispels, redirect a spell feints; hrozba v reaction economy.
- **Artillery Mage:** AoE a zóny; counterspells jako významná obrana, ne hlavní zdroj damage.
- **Battlefield Mage:** walls, isolation, protection a mobility; magie jako změna prostředí.
- **Ritual / Anchor Mage:** counterspell nebo power boost je navázán na aktivní focus, kruh, připravený objekt či ally — hráči dostávají encounter objective.

### Designové instrukce

1. **Counterspelly musí být skutečně relevantní.** Nestačí přidat „Counterspell“ do seznamu 25 kouzel, pokud monster nikdy neví, kdy a za jakou cenu jej použít.
2. Definuj **kdy může reagovat** (viditelný caster, dosah, percepce, probíhající casting), **co za to zaplatí**, jak se určí úspěch a zda spotřebuje reaction.
3. Counterspell by většinou měl mít **nejistý výsledek, dražší zvládání Epic efektů, omezený počet reakcí nebo zranitelnou infrastrukturu**. Permanentní automatický shutoff všech kouzel je nepříjemný.
4. Nezvyšuj jen DC. Vytvoř **dvě až tři odlišná rozhodnutí**: přerušit spell, chránit sebe/ally, reposition, vytvořit zónu.
5. Dej casterovi **spolehlivou akci v kole**, kdy nemůže/nechce utratit velký slot, a **důvod, proč je nebezpečný i bez counterspellu**.
6. U spell listu používej **existující skutečné efekty**. `00_Epic_System_Rules.md` u Epic spell catalogue definuje pouze název/tier/školu; **nesmí se z názvů domýšlet schopnosti**. U vlastních counterspell variant používej přesné potvrzené znění, pokud je k dispozici.
7. Počítej skutečné reakce na celé kolo: jeden reaction Counterspell může převážit jedno vlastní damage spell, ale není to „free defense“.

### Přepoužitelné ability patterns

**1. Arcane Interdiction — reaction, 1 [resource].** `When a creature the spellcaster can see within 90 feet begins casting a spell, the spellcaster may attempt to interrupt it. The spellcaster makes a spellcasting ability check against the triggering caster's spell save DC. On a success, the spell fails and any spell slot or other expended casting resource is lost. Attempting to interrupt an Epic spell costs 1 additional [resource].`  
*Účel:* jednoduchý interaktivní spell duel. *Counterplay:* out of sight/range, bait reaction, vyšší DC, vyčerpání resource. *Upozornění:* jde o **volitelný nový pattern**, nikoli převzaté univerzální pravidlo counterspellů; použití a vztah ke konkrétním Epic spells výslovně schválit u monstra.

**2. Counterspell Redirection — upgraded reaction.** `If the spellcaster successfully interrupts a spell that targets exactly one creature, it may spend 1 additional [resource] to redirect that spell instead of ending it, choosing another legal target within the original spell's range. All other parts of the spell resolve normally.`  
*Účel:* silné, ale úzce vymezené přesměrování. *Counterplay:* AoE/multiple targets, levnější spelly, žádný vhodný alternativní cíl. *Balanc:* často podstatně silnější než samotný counterspell; omezit četnost / Epic interakci.

**3. Spell Seal — action, 1 [resource].** `Choose one visible creature within 90 feet. Until the start of the spellcaster's next turn, the first spell it casts may be targeted by Arcane Interdiction with advantage on the spellcasting ability check.`  
*Účel:* viditelné varování; hráč může měnit plán nebo riskovat. *Cena:* akce a příští reaction, nikoli automatická negace.

**4. Unravel Concentration — action.** `One creature the spellcaster can see within 60 feet that is concentrating on a spell makes a DC [DC] Constitution saving throw. On a failure, it loses concentration. On a success, this ability has no effect.`  
*Účel:* cílí na existující magickou investici; *counterplay:* range, LoS, save, odstranění castujícího. *Balanc:* hodnota závisí na síle přerušeného kouzla.

**5. Focus of Interdiction — destructible objective.** `While its arcane focus remains intact within 30 feet of it, the spellcaster doubles the range of its counterspell abilities. The focus has [AC] and [HP], can be targeted normally, and provides no benefit while suppressed or destroyed.`  
*Účel:* hráči mají konkrétní cíl, nejen vysoký boss save. *Counterplay:* zničení focusu, displacement, blocking line of sight. *Balanc:* extra efektivní HP encounteru je i HP focusu a akce nutné na jeho zničení.

**6. Spell-Duel Momentum (1/Round).** `When one of the spellcaster's spells is successfully countered by a hostile creature, the spellcaster gains 1 [resource], up to its normal maximum.`  
*Účel:* zajímavé soupeření zdrojů; hráči mohou spell zastavit, ale tím posílí další kolo. *Balanc:* definovat start/max/gain a zabránit farmení drobných spellů; vhodné spíše pro konkrétní identitu (např. fanatik magie), ne univerzální perk.

**7. Veil Step — bonus action, 1 [resource].** `The spellcaster teleports to an unoccupied space it can see within 30 feet.`  
*Účel:* caster umí krátkodobě přežít melee pressure; *counterplay:* resource exhaustion, pressure z více úhlů. *Balanc:* nekombinovat automaticky s neomezeným Counterspell + Shield + extra reaction.

**8. Spellguard — reaction alternative.** `When a spellcaster or one of its allies within 30 feet takes damage from a spell, this creature may use its reaction and spend 1 [resource] to reduce that damage by [amount] for one target.`  
*Účel:* reakční rozhodnutí „counter nebo absorbovat?“. *Counterplay:* více spellů v kole, vzdálenost, rozdělení damage. *Balanc:* schopnost **soutěží o tutéž reaction** jako counterspell.

### Jak má fungovat counterplay hráčů

- **Bait:** první méně hodnotný spell vyláká reakci, druhý projde.
- **Vary:** AoE, attack, concentration a Epic spell vyžadují odlišný způsob reakce; ne vše má mít stejnou obranou odpověď.
- **Angle:** line of sight, rozsah a překážky.
- **Pressure:** melee hrozba, concentration saves a damage do focusu.
- **Resource war:** hráči záměrně nutí caster utrácet omezený pool.

### Typické chyby

- Počet counterspell reakcí se rovná počtu všech hráčů; caster prakticky vypne celou magic část encounteru.
- Counterspelly nemají vymezené reakce, cíle nebo pravidla interakce s Epic spells.
- Široký spell list plný jmen, jejichž skutečný efekt není definován.
- Monster je nebezpečné jedině tehdy, když hráči sesílají magie.
- Nejlepší strategie monstra je counterovat **úplně všechno**, bez nákladů a rozhodování.

**Projektové precedenty:** *Baalzebul* (placení spellů, teleportů a reactions HP) a *Belial* (restricted extra turn, široký skutečný spell list). Tyto modely **nedokazují**, že každý Spellcaster potřebuje HP casting či druhý tah.

### Kalkulace spell damage (AVG damage per round & CR)

U spellcasterů, kteří spoléhají na kouzla jako na svůj primární útočný engine namísto zbraňového Multiattacku, se **Expected DPR** počítá jako **průměrné poškození za kolo přes první 3 kola boje (AVG damage per round)** podle nejvyšších dostupných slotů (standardní 5e DMG metodika):

$$\text{DPR} = \frac{\text{Kolo 1 dmg} + \text{Kolo 2 dmg} + \text{Kolo 3 dmg}}{3}$$

Rozlišujeme dvě šíře spell listu:
- **Limited spell list:** Caster má na nejvyšších slotech situační, utilitní, single-target nebo čistě kontrolní kouzla (např. *Maze*, *Power Word Stun*, *Wall of Force*, *Teleport*, *Hold Person*), popř. single-target poškození s polovičním zásahem.
- **Great spell list:** Caster má k dispozici optimální útočná AoE kouzla s vysokým plošným zásahem (např. *Meteor Swarm*, *Chain Lightning*, *Delayed Blast Fireball*, *Cone of Cold*, *Fireball*), kde se **u AoE kouzel damage doubluje** (předpoklad zásahu alespoň 2 cílů s plným DMG dle 5e DMG pravidel).

---

#### 1. Non-Epic Caster Tiers (Základní 5e sloty)

| Stupeň castera | Nejvyšší sloty (kola 1–3) | Limited spell list | Great spell list | Ekvivalent v Encounter Points |
| :--- | :--- | :--- | :--- | :--- |
| **Apprentice** (do 4. levelu) | 4th + 3rd + 3rd | `(33 + 2 × 27) / 3` = <u>**29 DPR — CR 4**</u> | `(49 + 2 × 42) / 3` = <u>**44 DPR — CR 6.5**</u> | ~0.3 až 0.5 bodu |
| **Advanced** (do 7. levelu) | 7th + 6th + 5th | `(60.5 + 55 + 44) / 3` = <u>**53 DPR — CR 8**</u> | `(84 + 77 + 56) / 3` = <u>**72 DPR — CR 11**</u> | ~0.55 až 0.8 bodu |
| **Master** (do 9. levelu) | 9th + 8th + 7th | `(82.5 + 66 + 60.5) / 3` = <u>**70 DPR — CR 11**</u> | `(98 + 91 + 84) / 3` = <u>**91 DPR — CR 14**</u> | ~0.75 až 1.0 bodu |

---

#### 2. Kalibrace Epic spellů (Tier 1, Tier 2, Tier 3)

Epic spelly škálují nad úroveň 9. slotu. Platí pro ně klíčové systémové pravidlo:
> **Epic spelly mají vyšší damage než 9th-level non-epic spelly, ale ne o tolik více.** Nesmí odskočit natolik, aby rozbily encounter point systém (1 bod ≈ 80–100 DPR) nebo vymazaly celou družinu v jediném kole bez counterplay. U AoE kouzel se poškození opět **doubluje** (zásah 2 cílů).

##### Benchmarky jednotlivých kouzel dle úrovně (Single target vs AoE doubled):
| Úroveň kouzla | Single Target / Limited | AoE Doubled / Great | Reprezentativní příklady |
| :--- | :---: | :---: | :--- |
| **9th-level (Non-Epic)** | **82.5** | **98** | *Time Ravage* (82.5 single) vs *Meteor Swarm* / *Prismatic Wall* (98 AoE) |
| **Epic Tier 1** | **95** | **125** | *Crescent Cleave* (91 single), *Flash Freeze* (55 single / **110 AoE**), *Sonic Boom* (70 single / **140 AoE**) |
| **Epic Tier 2** | **120** | **155** | *Caldera* (90 single / **180 AoE**), *Prismatic Deluge* (120 single / **200–240 AoE**), *Maelstrom* (70 single / **140 AoE**) |
| **Epic Tier 3** | **155** | **195** | *Sphere of Ultimate Destruction* (165 single), *Obliterate* (220 line), *Inferno* (225 line + 45/turn) |

##### 3-Round AVG kalkulace pro Epic Castery:
Při kalkulaci prvních tří kol počítáme s nasazením nejvyšších Epic slotů doplněných o předchozí úroveň nebo 9th level non-epic slot:

| Epic Caster Stupeň | Typické sloty (kola 1–3) | Limited spell list | Great spell list (AoE doubled) | Encounter Points |
| :--- | :--- | :--- | :--- | :--- |
| **Epic Tier 1 Caster** | Tier 1 + Tier 1 + 9th | `(95 + 95 + 82.5) / 3` = <u>**91 DPR — CR 14**</u><br>*(při 3× T1 slotech: `95 DPR — CR 15`)* | `(125 + 125 + 98) / 3` = <u>**116 DPR — CR 18**</u><br>*(při 3× T1 slotech: `125 DPR — CR 20`)* | ~1.0 až 1.3 bodu |
| **Epic Tier 2 Caster** | Tier 2 + Tier 2 + Tier 1 | `(120 + 120 + 95) / 3` = <u>**112 DPR — CR 17**</u> | `(155 + 155 + 125) / 3` = <u>**145 DPR — CR 21**</u> | ~1.2 až 1.6 bodu |
| **Epic Tier 3 Caster** | Tier 3 + Tier 2 + Tier 1 | `(155 + 120 + 95) / 3` = <u>**123 DPR — CR 19–20**</u> | `(195 + 155 + 125) / 3` = <u>**158 DPR — CR 22**</u> | ~1.4 až 1.8 bodu |

---

#### 3. Reprezentativní Epic útočná kouzla a mechaniky

Zde jsou kanonická pravidla a rozbor damage klíčových Epic kouzel z kampaně:

##### Epic Tier 1
- **Flash Freeze (Tier 1 Evocation):**  
  *Oblast:* 20-foot radius.  
  *Efekt:* Con save nebo **10d10 cold damage** (průměr 55) a kondice @Icebound. Úspěšný save půlí poškození a neguje kondici.  
  *Damage hodnota:* Single target = **55**, AoE doubled (2 cíle) = **110 cold**.
- **Catastrophe (Tier 1 Necromancy):**  
  *Dosah:* Touch (melee spell attack).  
  *Efekt:* Při zásahu je cíl na 1 minutu zahalen negativní energií. Kdykoliv by si cíl obnovil HP, energie léčení zabrání a cíl místo toho ztratí stejný počet HP. Kouzlo končí, jakmile takto zabrání a obrátí celkem **200 HP**.  
  *Damage hodnota:* Zvrat léčení v poškození; efektivní přepočet v encounteru = **95–100/kolo** proti léčícím družinám.
- **Sonic Boom (Tier 1 Evocation):**  
  *Oblast:* 60-foot radius centrovaný na sesilatele.  
  *Efekt:* Všichni ostatní tvorové v oblasti Con save nebo **20d6 thunder damage** (průměr 70) a jsou oslepeni a ohluchnuti (@Blinded a Deafened), dokud nezískají alespoň 1 HP z magického efektu. V uzavřeném prostoru uděluje dalších 20d6 thunder.  
  *Damage hodnota:* Single target = **70**, AoE doubled (2 cíle) = **140 thunder**.
- **Crescent Cleave (Tier 1 Evocation):**  
  *Dosah:* Weapon reach (melee weapon attack v rámci seslání).  
  *Efekt:* Při zásahu udělí zbraň navíc **14d12 radiant damage** (průměr 91). Do konce tahu může útočník tento útok zopakovat proti dalšímu odlišnému cíli v dosahu (kumulativně až do počtu rovnajícího se spellcasting ability modifieru, např. 5 cílů).  
  *Damage hodnota:* Single target = **91 radiant**, sekvence na více cílů = 180–270+ radiant.

##### Epic Tier 2
- **Caldera (Tier 2 Transmutation):**  
  *Oblast:* Deset spojených 10-foot krychlí roztavené lávy (obtížný terén).  
  *Efekt:* Při vstupu nebo na začátku tahu: **20d8 fire damage** (průměr 90) a Con save nebo @Incapacitated do začátku svého dalšího tahu. Úspěch půlí DMG a ruší stav. Na začátku každého dalšího tahu castera s koncentrací se poškození zvyšuje o **2d8** (až na maximum **40d8**) a přibudou dvě 10ft krychle lávy.  
  *Damage hodnota:* Single target = **90 fire**, AoE doubled (2 cíle) = **180 fire**.
- **Prismatic Deluge (Tier 2 Evocation):**  
  *Oblast:* Válec o poloměru 150 stop a výšce 10 stop.  
  *Efekt:* Při seslání a jako akce v každém kole nechá sesilatel dopadnout až 2 koule do samostatných 15-foot krychlí:  
  - *Red:* Dex save or **120 fire damage** (polovina při úspěchu). Objekty a struktury berou triple damage.  
  - *Orange:* Dex save or **80 acid damage** (objekty triple damage).  
  - *Yellow:* Dex save or **40 lightning damage** a @Stunned do konce dalšího tahu.  
  - *Green:* Con save or **80 poison damage** a @Poisoned po dobu trvání.  
  - *Blue:* Con save or **80 cold damage** a rychlost je snížena na 0.  
  - *Indigo:* Con save or @Restrained; při celkem 3 selháních zkamenění (@Petrified).  
  - *Violet:* Wis save or zpomalen (rychlost poloviční, zákaz bonus actions a reakcí).  
  *Damage hodnota:* Červená koule na 2 cíle v AoE = **240 fire**; kombinace 2 koulí (např. Red 120 + Orange 80) = **200 DMG**.
- **Maelstrom of Pandemonium (Tier 2 Conjuration):**  
  *Oblast:* Cyklon o poloměru 30 stop a výšce 1 míle. Pohyb cyklonu až 120 stop akcí.  
  *Efekt:* Při vstupu nebo startu tahu: Str save nebo @Restrained, vytažení 100 stop do vzduchu a **70 (20d6) slashing damage**. Tvorové větší než Huge uspějí automaticky. Objekty a struktury berou **120 slashing damage** na konci každého tahu castera.  
  *Damage hodnota:* Single target = **70**, AoE doubled = **140 slashing**.

##### Epic Tier 3
- **Sphere of Ultimate Destruction (Tier 3 Conjuration):**  
  *Dosah:* 5-foot průměr koule prázdnoty. Pohyb až 60 stop jako bonus action.  
  *Efekt:* První kontakt v kole udělí **30d10 force damage** (průměr 165, Con save půlí). Cokoliv sražené na 0 HP je okamžitě a totálně zničeno bez ostatků. Při plném kontaktu dezintegruje i magické předměty legendární a nižší kvality.  
  *Damage hodnota:* Single target = **165 force**.
- **Obliterate (Tier 3 Evocation):**  
  *Dosah:* 15 stop široká linie nekonečné délky.  
  *Efekt:* Tvorové v linii utrpí **40d10 force damage** (průměr 220). Jako akce lze kouli nabíjet a za každé nabité kolo přidat dalších **20d10 force damage** (průměr 110).  
  *Damage hodnota:* Základní linie = **220 force**, kalibrovaný efektivní průměr v encounteru = **195 force**.
- **Inferno (Tier 3 Evocation):**  
  *Dosah:* Sloup lávy v linii 500 stop dlouhé a 15 stop široké.  
  *Efekt:* Tvorové, objekty a struktury v linii utrpí **50d8 hellfire damage** (průměr 225) a jsou obaleni lávou na 1 minutu (Dex save neguje obalení). Obalený tvor utrží dalších **10d8 hellfire damage** (průměr 45) na začátku každého svého tahu.  
  *Damage hodnota:* Okamžitý úder = **225 hellfire** + 45 DoT; kalibrovaný efektivní průměr v encounteru = **195–225 hellfire**.

---

#### 4. Pravidla pro Encounter Points a Akční ekonomii

1. **Rozpočet na kontrolu vs. poškození:** Pokud má mág *Limited spell list* (např. kontrolní Duelist s 70 DPR na Master úrovni nebo 112 DPR na Epic Tier 2), ušetřený rozpočet Encounter Points směřuje do counterspellů, obranných reakcí, mobility nebo záchranných mechanik. Naopak mág s *Great spell list* (např. 145 DPR u Tier 2) již sám o sobě spotřebovává 1.5–1.6 Encounter Points čistě svou útočnou silou.
2. **Akční modifikátory (Dual-Casting):** Pokud má monstrum schopnost seslat dvě kouzla v rámci jedné akce (např. *The Weirdboy*: 1 libovolný + 1 non-epic do 6. levelu):
   - Kolo 1: Tier 2 (Caldera 180 AoE) + 6th level (Chain Lightning 77 AoE) = **257 DMG**
   - Kolo 2: Tier 1 (Sonic Boom 140 AoE) + 5th level (Destructive Wave 56 AoE) = **196 DMG**
   - Kolo 3: 9th level (Meteor Swarm 98 AoE) + 4th level (Fireball 49 AoE) = **147 DMG**
   - **AVG DPR:** `(257 + 196 + 147) / 3 =` <u>**200 DPR**</u>. Takové monstrum má palebnou sílu **2.0–2.5 Encounter Points** jen v samotném kouzlení!

---

### Příkladné spell listy a styly kouzlení (Example Spell Lists)

Zde je pět osvědčených archetypů a formátů zápisu, které DnD Companion plně podporuje a automaticky parsuje do trackeru:

#### 1. Akční ekonomie & per-spell recharge (The Weirdboy)
*Vhodné pro:* Chaotické, nebezpečné blastery a warlordy. Místo tradičních slotů má každé kouzlo vlastní počet denních použití a caster sesílá **dvě kouzla v jedné akci** (jedno libovolné včetně Epic tieru a jedno non-epic do 6. levelu).

```markdown
**Spellcasting — LOUDER! BIGGER!** The Weirdboy casts two spells from the list below as one action, in an order of his choice. One can be of any level or Epic tier; the other must be a non-Epic spell of 6th level or lower. He uses Charisma for his spellcasting (spell save DC 24, +16 to hit with spell attacks) and requires no material components. Each spell has its own daily uses; no uses are shared. Spells retain their usual concentration requirements. Spells that require a reaction can only be cast as reactions, not as part of this action.

At Will: Fly, Misty Step, Counterspell, Dispel Magic, Shield, Dimension Door, Detect Magic, Thaumaturgy, Thunderwave, Shatter, Fireball, Lightning Bolt.
Counterspells: The Classic, The Mage Killer, The Feint (use their existing campaign rules).
3/Day Each: Chain Lightning, Disintegrate, Destructive Wave, Synaptic Static, Scatter, Prismatic Spray, Incendiary Cloud, Fire Storm, Reverse Gravity, Sunburst, Dominate Monster, Globe of Invulnerability.
1/Day Each: Meteor Swarm, Psychic Scream, Prismatic Wall, Maddening Darkness, Sonic Boom (Epic Tier 1), Hungry Fissure (Epic Tier 1), Reverse Magic (Epic Tier 1), Caldera (Epic Tier 2), Implosion (Epic Tier 2), Obsidian Tombs (Epic Tier 2).

All limited uses recharge when the Weirdboy finishes a long rest. Epic spells and named custom counterspells retain their established campaign mechanics; their effects are not redefined here.
```

#### 2. Hybridní Innate / Per-Day s Epic sloty (Urzha)
*Vhodné pro:* Silná vrozená monstra, polobohy a šamany. Kombinuje přehledné denní limity (At will, 3/day, 2/day, 1/day) s vyhrazenými Epic spell sloty.

```markdown
**Spellcasting.** Urzha casts one of the following spells, using its normal casting time. Her Epic spells use the actual campaign spell rules; their effects are not reproduced here.

At will: Blight, Command, Counterspell, Dispel Magic, Misty Step, Shield.
3/day each: Chain Lightning, Disintegrate, Hold Monster, Scatter, Synaptic Static, Telekinesis, Wall of Force.
2/day each: Dominate Monster, Feeblemind, Maze, Power Word Stun, Reverse Gravity.
1/day each: Mass Polymorph, Meteor Swarm.
Epic Tier 1 (3 slots): Catastrophe, Crown of Vermin, Hungry Fissure, Reverse Magic.
Epic Tier 2 (2 slots): Anatomy Augmentation, Bloodbane, Implosion, Obsidian Tombs.
```

#### 3. Archdevil High-Level Wizard s Epic sloty (Belial)
*Vhodné pro:* Dlouhověké arcimágy, lichy a arcidábly (24th-level caster). Nižší sloty (1.–3. level) jsou `(at will)` bez vyčerpání zdrojů, sloty 4.–9. levelu jsou rozšířené a doplněné o Epic Tier 1 a 2 sloty a dedikované counterspelly.

```markdown
**Spellcasting.** Belial is an 24th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 25, +17 to hit with spell attacks). Belial has the following wizard spells prepared:

Counterspells: The Classic, The Feint, The Mage Killer
Cantrips (at will): Fire Bolt, Ray of Frost, Mage Hand, Prestidigitation, Shocking Grasp
1st level (at will): Detect Magic, Identify, Shield, Magic Missile
2nd level (at will): Hold Person, Misty Step, Invisibility
3rd level (at will): Counterspell, Fireball, Dispel Magic, Fly
4th level (5 slots): Greater Invisibility, Wall of Fire
5th level (4 slots): Cone of Cold, Bigby's Hand, Wall of Force
6th level (3 slot): Chain Lightning, Mass Suggestion
7th level (3 slot): Teleport, Delayed Blast Fireball
8th level (2 slot): Power Word Stun, Abi-Dalzim's Horrid Wilting
9th level (2 slot): Time Ravage, Prismatic Wall
Epic Tier 1 (3 slots): Antimagic Ray, Reverse Magic, Catastrophe
Epic Tier 2 (2 slots): Caldera, Prismatic Deluge
```

#### 4. Klasický 20th-level Archmage (The Archmage)
*Vhodné pro:* Standardní high-level humanoidní kouzelníky (20th-level wizard slot progression podle PHB) s kampaňovými counterspelly.

```markdown
**Spellcasting.** The archmage is an 20th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The archmage has the following wizard spells prepared:

Counterspells: The Classic, The Feint, The Mage Killer
Cantrips (at will): Fire Bolt, Ray of Frost, Mage Hand, Prestidigitation, Shocking Grasp
1st level (4 slots): Detect Magic, Identify, Shield, Magic Missile
2nd level (3 slots): Hold Person, Misty Step, Invisibility
3rd level (3 slots): Counterspell, Fireball, Dispel Magic, Fly
4th level (3 slots): Greater Invisibility, Wall of Fire
5th level (3 slots): Cone of Cold, Bigby's Hand, Wall of Force
6th level (2 slot): Chain Lightning, Mass Suggestion
7th level (2 slot): Teleport, Delayed Blast Fireball
8th level (1 slot): Maze, Power Word Stun
9th level (1 slot): Time Stop, Prismatic Wall
```

#### 5. Kurátorský utility/control caster s Epic sloty (The Librarian)
*Vhodné pro:* Strážce vědění a akademické mistry. At-will obrana a cantripy v nižších slotech, plnohodnotné sloty 4.–9. levelu a Epic Tier 1 sloty.

```markdown
**Spellcasting.** The librarian casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 23):

Cantrips: fire bolt, ray of frost, mage hand, prestidigitation, shocking grasp
1st Level (at will): detect magic, identify, shield, magic missile
2nd Level (at will): hold person, misty step, invisibility
3rd Level (at will): counterspell, fireball, dispel magic, fly, [antagonize](https://5e.tools/spells.html#antagonize_bmt)
4th Level (3 slots): greater invisibility, wall of fire
5th Level (3 slots): cone of cold, bigby's hand, wall of force
6th Level (2 slots): chain lightning, mass suggestion
7th Level (2 slots): teleport, delayed blast fireball
8th Level (1 slots): maze, power word stun
9th Level (1 slots): meteor swarm, prismatic wall
Epic Spell Tier 1 (3 slots): Crescent Cleave (page 145), Reverse Magic (page 160), Flash Freeze (page 149)
```

---

## 5. LEADER — multiplikátor spojenců a koordinace

### Identita a fantasy

**Leader** je monstrum, jehož hodnota je výrazně vyšší, když má spojence. Řídí formaci, dává buffy, umožňuje přesuny, extra útoky, cleanses nebo přechody mezi cíli. V encounteru se stává **prioritním cílem** ne proto, že dává největší vlastní damage, ale protože mění sílu ostatních.

**Pocit hráčů:** „Pokud ho necháme žít, celé nepřátelské uskupení bude nebezpečnější. Musíme rozbít jeho velení.“

### Podtypy

- **Banner / Aura Leader:** prostorově omezená aura (attack accuracy, saves, morale, cover).
- **Commander:** taktické rozkazy, movement a granted actions mimo vlastní tah spojenců.
- **Protector:** zachraňuje ally, přebírá zásahy, předává temporary HP, cleanse.
- **Enabler:** označuje prey, připravuje focus fire, repositionuje ally pro kombo.
- **Warband Leader:** zprostředkuje společný faction resource, akce, Hunt, reinforcement.

### Designové instrukce

1. Leader má mít **konkrétní závislost na spojencích**. Pokud jeho buff funguje jen na sebe, jeho hlavní rolí není Leader.
2. Vybírej **1 hlavní formu vedení**: silná aura *nebo* příkazy *nebo* sdílený resource. Nekombinuj několik silných multiplikátorů automaticky.
3. **Aury vytvářej s prostorovým counterplay:** dosah, nutná viditelnost, standarty, spojení formace, aktivní buff s vypínací podmínkou.
4. **Granted attacks a movement jsou část Leaderova power budgetu.** Přidělené reakce allyů musí respektovat jejich skutečné reakce; bezplatné útoky několika silných monster jsou extrémní damage boost.
5. Buff **+5 na saves nebo trvalé advantage na attack rolls** je v Epic systému silný, hlavně u velké skupiny. Není to univerzální drobná aura.
6. Urči, zda aury **stackují**, zda podporují summon/resurrected ally, co se stane při smrti/unconscious vůdce a zda se více Leaderů může navzájem buffovat.
7. Leader může mít slušný vlastní útok, ale rozhodnutí „rozkaz vs. vlastní damage“ musí být reálné.
8. Pokud je sám, má fungovat jako slabší bojovník, nikoli potají přepnout do Elite se stejným nebo vyšším DPR.

### Přepoužitelné ability patterns

**1. Standard of the Onslaught — aura.** `Allied creatures within 15 feet of the leader have advantage on attack rolls while they can see the leader and the leader is not Incapacitated.`  
*Účel:* jasné rozhodnutí „zničit banner nebo rozdělit formaci?“. *Counterplay:* distance, control leadera, cover; může být předmětem attack. *Balanc:* vyčíslit změnu hit chance každého ally za kolo.

**2. Iron Discipline — aura.** `Allied creatures within 15 feet of the leader gain a +5 bonus to saving throws while the leader is conscious.`  
*Účel:* magická/disciplinární ochrana formace. *Counterplay:* separation, focus leader, odstranění. *Balanc:* obrovsky posiluje durability proti save-based controlu; nedávat zdarma k velmi silné útočné auře.

**3. Order: Strike — action, 1/Round.** `Choose one allied creature within 60 feet that can hear the leader. That creature can use its reaction to make one weapon attack.`  
*Účel:* silný příkaz; *counterplay:* vyčerpat reaction, silence, distance, control ally. *Balanc:* účtovat očekávaný damage tohoto extra útoku do encounter DPR.

**4. Order: Reposition — bonus action, 1 [resource].** `Choose up to two allies within 60 feet that can see or hear the leader. Each may use its reaction to move up to half its speed without provoking opportunity attacks.`  
*Účel:* dynamická formace. *Counterplay:* reaction denial, line of sight/hearing, displacement. *Balanc:* může otevřít cestu k následným plným Multiattackům; není „jen movement“.

**5. Shield the Line — reaction, 1 [resource].** `When an ally within 30 feet is hit by an attack, the leader reduces the damage of that attack by [amount].`  
*Účel:* protector Leader, který soutěží o svoji reakci s jinými pravidly. *Balanc:* efektivní HP spojenců, nikoli Leaderovo vlastní HP.

**6. Rally the Broken — action, 1 [resource].** `Up to three allied creatures within 30 feet that can hear the leader gain [temporary HP] each and may immediately repeat one saving throw against a non-Epic effect imposing Frightened or another specified condition.`  
*Účel:* záchrana ochromené formace. *Counterplay:* AoE, out of range, target leader. *Balanc:* násobit temp HP **počtem allyů** a sledovat cleanse.

**7. Priority Target — bonus action.** `The leader designates one hostile creature it can see within 60 feet. Until the start of the leader's next turn, the first attack roll against that target made by each of up to two designated allies has advantage.`  
*Účel:* řízený focus fire. *Counterplay:* break sight, move, deny targeted allies. *Balanc:* omezení na dva spojence brání nekonečnému násobení.

**8. Break Their Line — command action, 1 [resource].** `Choose up to two allied creatures within 60 feet. Each may use its reaction to move up to half its speed and attempt one Shove or Grapple against a creature it reaches.`  
*Účel:* Leader generuje **control** bez vlastní celoplošné magie. *Balanc:* bonusové akce allyů mohou být silné, i když neudělí damage; jasně vymezit, že to nejsou celé turns.

**9. Command Anchor — destructible objective.** `The leader's strongest aura functions only while its war banner remains planted within 30 feet. The banner has [AC], [HP], and loses its effect when destroyed or carried beyond that range.`  
*Účel:* taktické objective, ale lze aplikovat i na buben, prapor či runový standard. *Counterplay:* obejít Leaderův HP bar a zničit zdroj buffu.

### Jak Leader přidává „skrytý“ výkon

U Order: Strike je Leaderův příspěvek **damage ally útoku**, nikoli 0 damage jen proto, že zbraň drží jiná bytost. Pokud ally útočí za 70 damage on hit s 65% úspěšností, jeden dodatečný útok má přibližně **45,5 expected damage** před kritiky; dva takové příkazy v kole už znamenají cca **91 expected DPR navíc**.

Stejně musí být oceněna ochrana před kontrolou, posuny do melee, regenerace, temporary HP a návraty dead allyů. Buff s nulovým přímým damage může mít obrovskou encounter value.

### Typické chyby

- Leader má silné aury, command attack, mass cleanse i resurrection bez reálné ceny.
- Buffuje 8 jednotek, ale balance se počítá, jako by buffoval dvě.
- Aury mohou stackovat mezi více Leadery a vzniká nekontrolovatelná kombinace.
- Bez line of sight, dosahu či vypínací podmínky nelze schopnosti takticky obejít.
- Leader není odměnou za target prioritization; po smrti se nic nezmění.

**Projektové precedenty:** *Gruumsh Warband Chassis* ukazuje shared Favor, Hunt a Warband Actions; nízkobudžetový jednotlivec může být výrazný díky frakčnímu systému. U standard bearer a musician lze používat **attack advantage** a **+5 saves aury** jako výrazné, nikoli malé buffy. Uváděné Warband Actions však patří konkrétnímu systému a nejsou automaticky vlastností každého Leadera.

---

## 6. RANGED — hrozba, která vynucuje přiblížení

### Identita a fantasy

**Ranged** je monstrum, které opravdu **trestá setrvávání v dálce nebo na otevřeném terénu**. Nutí hráče vyrazit vpřed, využít cover, přerušit linii palby, změnit výškovou úroveň či přesunout samotného střelce. Dobré Ranged monstrum je **silnější v ideální palebné pozici**, ale slabší, pokud se hráči dostanou dovnitř jeho obrany.

**Pocit hráčů:** „Nemůžeme tu stát a tradeovat damage. Musíme ho dostat z jeho pozice.“

### Podtypy

- **Sniper:** vysoký single-target pressure; vyžaduje line of sight a přípravu.
- **Suppressor:** omezuje bezpečné trasy, nutí změnit movement; damage je druhotný.
- **Artillery:** silný telegraphed AoE na dlouhý dostřel.
- **Mobile Skirmisher:** střílí, ustupuje, mění úhel; musí existovat řešení proti nekonečnému kitingu.
- **Siege / Cover Breaker:** narušuje kryty a bezpečné pozice, ne automaticky všechny ignoruje.

### Designové instrukce

1. **Musí hrozit na vzdálenost, která reálně přesahuje běžné melee a movement hrozby.** Samotný 60ft. útok nestačí, pokud se hráči dostanou na 60 ft. bez rozhodnutí.
2. Ukaž hráčům **ideální range, pozici a její slabinu**: výhled, elevation, sniper nest, omezený úhel, reload, stojící stance.
3. Dejte mu **vlastní ranged damage nebo suppression**, ne jen ranged attack menší než jeho melee útok.
4. Vytvoř přirozený důvod **closovat**: blízko ztrácí výhodu accuracy/damage/LoS, jeho těžká zbraň má omezení, nebo closing ruší setup.
5. Má mít nástroj proti prvnímu melee kontaktu, **ale ne nekonečný únik zdarma**. Mobility je resource, cooldown, ustoupení jen jednou či vyžaduje neobsazené trasy.
6. Nebuď „fake Ranged“: pokud může stejně dobře střílet na vzdálenost 5 ft. a nemá žádnou slabinu, hráči za closing nejsou odměněni.
7. Cover a line of sight mají být **důležitá část hry**, ne ignorována všemi útoky.
8. Damage na **AoE více cílech**, opakovaných reactions a přípravě střelby se musí zvlášť spočítat.

### Přepoužitelné ability patterns

**1. Aimed Shot — bonus action setup.** `The ranged creature chooses a target it can see within 150 feet. Its next ranged weapon attack against that target before the end of its next turn has advantage and deals [bonus damage] on a hit. The benefit ends early if the creature moves or loses sight of the target.`  
*Účel:* telegraphed velká střela; *counterplay:* cover, forced movement, closing, breaking sight. *Balanc:* započítat aim bonus spolu s hit chance.

**2. Pinning Shot (1/Turn).** `When the creature hits with a ranged weapon attack, it may reduce the target's speed by 20 feet until the start of the creature's next turn.`  
*Účel:* částečně maří closing. *Counterplay:* Dash, teleport, crossing cover, ally repositioning. *Balanc:* pokud kombinuješ s dlouhým range a bezplatným retreatem, může vzniknout nehratelný kite lock.

**3. Overwatch — action + reaction.** `The creature chooses a visible 30-foot-wide lane within its weapon's range. Until the start of its next turn, when a hostile creature enters or moves through that lane, the creature may use its reaction to make one ranged weapon attack against it.`  
*Účel:* hráči plánují trasu. *Cena:* vlastní action na setup a jedna reaction na výstřel; nepřidávej zdarma plný Multiattack.

**4. Suppressive Volley — alternative action.** `Choose a 20-foot-radius area within 150 feet. Each creature of the monster's choice in the area makes a DC [DC] Dexterity saving throw, taking [moderate damage] on a failure or half as much on a success. On a failure, the target's speed is halved until the end of its next turn.`  
*Účel:* otevřené plochy jsou nebezpečné. *Counterplay:* spacing, cover, změna trasy. *Balanc:* action, damage × počet cílů; nevyřazovat zároveň Dash a veškerou mobilitu.

**5. Piercing Line — alternative action.** `The creature fires in a 120-foot-long, 5-foot-wide line. Creatures in that line make a DC [DC] Dexterity saving throw, taking [damage] on a failure or half as much on a success.`  
*Účel:* trestá line formation. *Counterplay:* rozestupy, flanking, výškové úrovně. *Balanc:* stejné damage neaplikuj jako free bounce k Multiattacku.

**6. Shatter Cover — aimed utility.** `As an action, the creature makes one ranged attack against a visible, destructible object or section of cover, dealing [siege damage] to that object. If destroyed, creatures behind it lose the cover it provided.`  
*Účel:* hráči musí měnit kryty, ale cover zůstává významný. *Counterplay:* reposition, interrupt, útok na střelce.

**7. Skirmisher's Retreat — bonus action, 1 [resource].** `The creature moves up to half its speed without provoking opportunity attacks.`  
*Účel:* krátkodobě obnoví odstup. *Counterplay:* resource exhaustion, area control, surround, terrain. *Balanc:* pokud je zdarma každé kolo, melee hráči ji nemusí nikdy dohnat.

**8. Sniper's Nest — positional trait.** `While the creature has not moved since the start of its turn and has higher ground than its target, its ranged attacks ignore half cover and deal [bonus damage]. This benefit ends as soon as it moves.`  
*Účel:* střelec má teritoriální sílu a jasnou slabinu. *Counterplay:* donutit jej opustit pozici, flank, cover vyšší kvality, teleportace.

**9. Harrying Fire — reaction alternative.** `When a hostile creature within 30 feet of the ranged creature moves toward it, the creature may use its reaction to make one ranged weapon attack against that creature. This attack cannot reduce the target's speed.`  
*Účel:* poslední obranný výstřel. *Balanc:* nepřidávat zároveň Speed 0, retreat i masivní damage; closing musí být nakonec odměněn.

### Ranged test

Při playtestu polož otázku: **Co získá hráč, který investuje dvě kola do dosažení střelce?** Pokud nic (střelec zůstane stejně efektivní v melee nebo zdarma zmizí 100 ft. pryč), mechanismus je pravděpodobně frustrující.

Ranged nepotřebuje automaticky vysoké HP. Jeho **efektivní durability** plyne z distance, cover, LoS a času, který hráči stráví closingem. Tyto nepřímé obrany musí být započteny.

### Typické chyby

- Ranged drží odstup, ale zranění je příliš malé; hráči ho mohou bez následků ignorovat.
- Každý hit slowuje, zatímco střelec zdarma neustále ustupuje.
- Všechny střely ignorují cover a není možné zlomit line of sight.
- Identická nebo lepší efektivita v melee znamená, že closing nemá cenu.
- Přesná dlouhá střelba + extrémní AoE + skvělý melee + silná antimagie bez přiměřeného budgetu — to už je spíš Elite/boss mix než čistý Ranged.

---

## 7. ELITE — všestranná hrozba se silným damage a aktivní antimagickou obranou

### Identita a fantasy

**Elite** je bojovník, který dokáže **skutečně ohrozit hráče damage** a současně se **nenechá snadno neutralizovat magií**. Nejde jen o „větší Monster“, vyšší HP nebo přidané Legendary Resistance. Charakteristická je **kompetentní ofenziva plus aktivní způsob, jak odpovídat na spelly, magie a control**.

**Pocit hráčů:** „Pouhé nuke ani jediný disabling spell problém nevyřeší. Musíme jeho obranu vyčerpat nebo překonat, ale přitom si nesmíme dovolit ignorovat jeho damage.“

### Minimální funkční profil Elite

Elite by mělo splnit **obě** podmínky:

1. **Credible kill pressure:** má alespoň jeden jasný způsob, jak dodat významné damage — silný Multiattack, burst, charge, execution combo, výhodnou AoE, attack window nebo nebezpečné reakční útoky.
2. **Credible anti-magic:** má spolehlivou a srozumitelnou odpověď na důležité magické hrozby — resource-based resistance/negation, conditional spell interruption, cleanses, anti-control movement, vyřazení concentration nebo interakci s epic effects.

**Nestačí:** vysoké AC, velké HP nebo jen Magic Resistance jako přilepená položka, pokud epická magie monster stále spolehlivě vypíná.

### Podtypy

- **Arcane-Breaker Knight:** fyzický damage + aktivní antispell po zásahu nebo při castění.
- **Unyielding Champion:** damage + omezený defensive pool, který překonává saves, damage a disabling effects.
- **Adaptive Duelist:** vysoký single-target pressure + reakční counterplay magie, ale nedisponuje širokým spell listem.
- **Assault Vanguard:** velké damage v contact range + mobilita/repositioning proti wall/control.
- **Boss Elite:** stejné dvě osy, ale v dlouhém souboji dostává resource tension, další turn nebo fáze; vše se počítá v celkovém DPR.

### Designové instrukce

1. Napřed navrhni **nebezpečný způsob útoku**. Potom přidej antimagii, která jej udržuje relevantní — ne opačně.
2. Antimagie musí mít **jasné náklady**: omezený resource, HP loss, reaction, cooldown, naakumulovanou slabinu či cenu v ofenzivním tempu.
3. Ideální je **jeden společný pool pro offense/defense**; hráči mohou jeho obranná použití vynutit a tím oslabit další burst.
4. Elite není automatický Spellcaster. **Přejímání magických efektů fyzickými reakcemi** je plnohodnotný koncept.
5. Magická obrana by neměla být *absolutní* proti všemu. Vytvoř vulnerability window: vyčerpaný pool, spent reaction, exposed position, kontrola s jiným typem save nebo omezení vůči Epic effects.
6. Pokud je antimagie založená na **negaci libovolného damage**, značně zvyšuje effective HP. Nepřipočítávej ještě „pro jistotu“ výrazně vyšší listed HP.
7. Vždy přepočítej **burst**, hlavně při kombinaci Multiattack + bonus attack + reaction + extra turns a damage multipliers.
8. Pokud Elite kromě toho nese významný leadership, ranged a controller kit, jde o **multi-role boss** a encounter points musí zohlednit všechny tyto systémy.

### Přepoužitelné ability patterns

**1. Unyielding Focus — protective resource.** `When the elite fails a saving throw, it may spend 1 [resource] to succeed instead. Alternatively, at the start of its turn, it may spend 1 [resource] to suppress one effect that would prevent it from taking actions until the end of that turn (the effect does not end). An Epic effect costs 1 additional [resource].`  
*Účel:* zachovává action economy; *counterplay:* vynucení resource, několik různých kontrolních pokusů. *Balanc:* nesmí se překrýt s další stejně silnou zdarma fungující resistance.

**2. Aegis of Impact — reaction, 1 [resource].** `When the elite would take damage from a spell, it may use its reaction to reduce that damage by [amount].`  
*Účel:* rozhodnutí absorbovat damage nebo ponechat reakci na útok. *Counterplay:* další spelly/damage téhož kola, damage mimo spelly, resource pressure. *Balanc:* silná mitigace se počítá jako effective HP.

**3. Mage-Hunter's Rush — reaction, 1 [resource].** `When a creature the elite can see within 60 feet casts a spell, the elite moves up to half its speed toward that creature without provoking opportunity attacks and may make one melee attack against it if it ends within reach. The triggering spell resolves normally.`  
*Účel:* spellcasting není bezpečné jen proto, že caster stojí mimo melee. *Counterplay:* distance, cover, bait, control movement. *Balanc:* **reakční attack je extra DPR**; nedovoluj bezplatně zároveň automaticky rušit spell.

**4. Spellshattering Strike — replaces one attack.** `On a hit against a creature concentrating on a spell, the target makes the normal concentration saving throw with disadvantage. The attack deals its normal damage.`  
*Účel:* antimagie vychází z fyzického útoku. *Counterplay:* distance, protection ally, předcházet zásahu. *Balanc:* silné proti hodnotným koncentracím; při opakovaných zásazích možnost rychle zničit důležité spelly.

**5. Break the Binding — bonus action, 1 [resource].** `The elite ends one non-Epic effect currently affecting it that reduces its speed, restrains it, or prevents its movement. Against an Epic effect, it instead immediately repeats any allowed saving throw against that effect with advantage.`  
*Účel:* probojuje se z omezení bez celkové imunity. *Counterplay:* variety control, Epic effects, forcing use before important attack. *Pozor:* u efektů bez saving throw musí být určen vlastní mechanismus, jinak je nepoužitelná druhá větev.

**6. Breakthrough Charge — alternative action.** `The elite moves up to its speed toward a hostile creature, ignoring nonmagical difficult terrain, and makes one heavy melee attack. On a hit, the attack deals [high damage] and pushes the target up to 20 feet.`  
*Účel:* spolehlivý gap closer, nikoli pasivní bonusová damage při každém pohybu. *Balanc:* nahrazuje Multiattack; interakce s magical barriers musí být samostatně definována.

**7. Decisive Combination — offense choice.** `When the elite takes the Multiattack action, after its first attack hits a creature, it may replace all remaining attacks of that Multiattack with one Finisher attack against the same target. On a hit, the Finisher deals [heavy damage]; on a miss, it deals no damage.`  
*Účel:* riskantní burst namísto konzistentních dalších útoků. *Balanc:* očekávaný damage a spolehlivost Finisheru porovnat s počtem nahrazených útoků; nelze získat oba výstupy.

**8. Magic-Breaker's Challenge — on-hit, 1/Turn.** `When the elite hits a creature with a melee attack, it may spend 1 [resource] to force the creature to make a DC [DC] Constitution saving throw. On a failure, the creature cannot cast spells requiring verbal components until the start of the elite's next turn.`  
*Účel:* selektivní spell disruption místo kompletní anti-magic zóny. *Counterplay:* spacing, other components, saves, resource attrition. *Balanc:* jde o control s vysokou cenou, neskládat s automatickým Stunned.

**9. Spell-Broken Momentum (1/Round).** `After the elite successfully suppresses or ends an effect that was preventing its actions, it may move up to 10 feet without provoking opportunity attacks.`  
*Účel:* elitní válečník se probíjí i přes control. *Balanc:* mobility je reward, nikoli zdarma další útok.

### Příklad jedné ekonomiky zdroje

Jeden pool *Battle Focus* (název je ilustrativní, nikoli nové univerzální pravidlo):

- **Offense:** utratit 1 Focus za jednorázový burst nebo agresivní gap close.
- **Defense:** utratit 1 Focus za překonání non-Epic save/control; Epic hrozba může vyžadovat 2 Focus podle konkrétní ability.
- **Tension:** když Elite utratí Focus na obranu, oslabí svou příští ofenzivu.
- **Player influence:** hráči mohou vynutit Focus přes meaningful magie/control před vlastním burstem.
- **Statblock MUST:** start/max Focus, přesné gain triggery (případně žádné), omezení spendů, reset a stav při 0 HP.

Nezaváděj současně *Battle Focus*, *Arcane Ward charges* a *Adrenaline* pro téměř totožné účely. Pokud jich je víc, musí mít odlišný herní význam.

### Typické chyby

- „Elite“ je jen Monster s dvojnásobným HP.
- Má nejlepší damage, mobilitu, crowd control, counterspells, aury a obranu bez jakéhokoli kompromisu.
- Magie proti němu vždy selže, takže spellcasteři nemohou ničím přispět.
- Překonání kontroly ho nestojí nic, takže hráčský control nemění jeho rozhodování.
- „Strong magic defense“ je jen advantage na saves, ale proti silným Epic efektům nemá žádný skutečný plán.
- Offense je silná jen na papíře, protože nemá mobility ani dosah, aby své útoky použil.

**Projektové precedenty:** *Cassiel* (obranný resource, který zároveň nebezpečně eskaluje vlastní stav), *Pandemonium Ravager* (společný pool offense/defense a vyhraněná fáze) a *Chosen Rider of Gruumsh* (výrazné attack, mobility a reakce). Jsou to inspirace **designového principu**, ne univerzální sady schopností Elite.

---

## 8. Jak role spolupracují v encounteru

Role dávají největší smysl **jako součást encounteru**, ne jako izolované štítky.

| Kombinace | Vznikající rozhodnutí | Riziko přestřelení |
| --- | --- | --- |
| **Monster + Leader** | Kdo je prioritou: buffovaný frontliner, nebo zdroj buffu? | Vysoké damage přes grantované útoky a aury |
| **Controller + Ranged** | Jak se dostat ke střelci, když někdo stopuje movement? | Nefér kiting a nemožnost closovat |
| **Controller + Spellcaster** | Jak seslat zásadní spell, když Grappler omezuje komponenty a mág counteruje? | Totální spell shutdown |
| **Leader + Controller** | Jak rozbít formaci, která dává víc movement a control akcí? | Ztráta několika hráčských tahů bez counterplay |
| **Ranged + Monster** | Máme rychle prorazit frontline nebo se krýt před sniperem? | Neudržitelný ranged damage v otevřené mapě |
| **Elite + Support/Leader** | Kdy nejprve vyčerpat obranu Elita a kdy odstranit jeho support? | Příliš vysoké efektivní HP a burst |
| **Elite + Spellcaster** | Kdo zajišťuje anti-magic a kdo útočí, když druhý má reakci vyčerpanou? | Překrývající se automatické counter efekty |

### Ilustrační smíšený encounter (11 points; žádná role nemá pevnou bodovou cenu)

- Monster — 1 point: drží základní melee pressure.
- Controller — 2 points: Grappler / frontliner blokuje průchod.
- Spellcaster — 2 points: counterspelly a magie mění tempo boje.
- Leader — 2 points: podporuje dva až tři spojence, ale sám je zranitelnější.
- Ranged — 1 point: sniper z vyvýšené pozice nutí hráče přesouvat se.
- Elite — 3 points: hlavní nebezpečný protivník, který umí prorazit control i přežít kritický spell.

**Nejde o doporučené pevné složení.** Je to test rozdílných funkcí. Reálný encounter se může skládat výhradně z jedné či dvou rolí a jeho síla je ovlivněna mapou, synergiemi a action economy.

### Kdo má co řešit?

- **Monster:** zajišťuje, že boj dál bolí i tehdy, když ostatní triky selžou.
- **Controller:** mění kde a jak lze bojovat.
- **Spellcaster:** mění, zda a kdy projdou spelly.
- **Leader:** mění hodnotu ostatních nepřátel a jejich spolupráce.
- **Ranged:** mění priority movementu a cover.
- **Elite:** mění, jaké zdroje si hráči musí připravit, aby jej spolehlivě zastavili.

---

## 9. Praktická designová šablona pro nový monster type

Před psaním statblocku vyplň:

```text
Monster name / fantasy:
Primary type:
Secondary role (optional):
Encounter points:
What should the players FEEL?
One tactical question the monster asks:

Defining mechanic 1:
- What action/trigger enables it?
- What decision does it force?
- What is the player's counterplay?

Defining mechanic 2:
- What action/trigger enables it?
- What decision does it force?
- What is the player's counterplay?

Defining mechanic 3 (only if needed):
Core attack / DPR baseline:
Mobility and preferred distance:
Defensive plan and magic interaction:
Resources — start/max/gain/spend/reset/0 HP:
Reactions and off-turn attacks:
Best turn and worst turn:
Expected DPR and burst DPR:
AoE, allies' granted damage, and effective durability:
Failure case if signature mechanics are countered:
Encounter composition and terrain assumptions:
```

### Quick sanity-check podle role

**Monster**
- Má smysluplnou standardní akci a alespoň jednu použitelnou alternativu?
- Je jeho výkon realistický při skutečné hit chance?

**Controller**
- Může hráč něco udělat, když dostane control?
- Není efekt fakticky stun-lock s jiným názvem?
- Má control přesné trvání, konec a counterplay?

**Spellcaster**
- Je counterspell na správném reakčním a zdrojovém budgetu?
- Co caster dělá, když nikdo nesesílá spell?
- Jsou všechny použité custom/Epic spelly skutečně definovány?

**Leader**
- Kolik damage/HP/úspěšných saves nepřímo přidá ostatním?
- Je jeho odstranění/oddělení skutečně takticky významné?
- Jsou aury a grantované akce omezené a nestackují neúmyslně?

**Ranged**
- Musí se hráči opravdu přiblížit nebo změnit pozici?
- Funguje cover / line of sight a existuje odměna za closing?
- Nedokáže střelec zadarmo donekonečna kitovat?

**Elite**
- Má zároveň credible kill pressure a credible anti-magic?
- Lze jeho magic defense vyčerpat, obejít nebo načasovat?
- Není účinnější než každý specialista ve všech rolích najednou?

### Finální verifikační checklist pro každý dokončený statblock

1. **DPR:** počítej normal action, burst, reaction, bonus action, AoE, extra turns, ally attacks a damage z persistent effects.
2. **Durability:** HP, AC, damage prevention, resistances, temporary HP, healing, cleanses, resurrect/extra health bars, bodyguards a special defeat rules.
3. **Action economy:** přesný počet turns, reactions, granted actions, refresh timing, once per turn vs once per round.
4. **Rules integrity:** definuj start/max/gain/spend/reset zdrojů, trvání a zánik conditions, velikosti/viditelnost/dosahy, dostupnost ability při 0 HP a při disable.
5. **Counterplay:** hráči mají smysluplná rozhodnutí před efektem i po něm; žádné neúmyslné nekonečné smyčky nebo automatická nedostupnost celé části systému.
6. **Point budget:** přepočítej nejen listed HP a damage, ale také vše, co zvyšuje nebo snižuje počet užitečných hráčských akcí.
7. **Template:** až po návrhu identity napiš finální `.md` statblock ve formátu `01_Statblock_Template.md`; tento soubor je příručka pro design, **není** importní statblock.

---

## 10. Stručné definice pro rychlé použití

- **Monster:** jednoduchý, spolehlivý protivník s jasnou fyzickou či taktickou hrozbou a malým počtem mechanik.
- **Controller:** narušuje svobodu pohybu, akcí, cílení a formace; nutí hráče řešit překážky své taktiky.
- **Spellcaster:** vede magický souboj skrze skutečné spelly a zásadní práci s counterspelly a jejich ekonomikou.
- **Leader:** násobí výkon dalších monster a vytváří target-priority či formation puzzle.
- **Ranged:** vytváří neudržitelnou dálkovou hrozbu, která vyžaduje closing, cover nebo obcházení palebných pozic.
- **Elite:** kombinace kvalitního damage a **aktivní, překonatelné** obrany proti magii; hráči musí vyčerpávat jeho zdroje a volit načasování.

**Hlavní pravidlo designu:** Přidání schopnosti je oprávněné, pokud **mění rozhodnutí hráčů nebo monstrum samo stojí před skutečnou volbou**. „Další bonus damage, další imunita, další resource“ bez změny hry není samo o sobě dobrý design.
