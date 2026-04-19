"""
Fix merits and flaws to match the V5 information file.

- Adds missing merits: Semblance of the Methuselah, Custodian of History,
  Pack Diablerie, Object of Power, Ley Line Leach, Corpse Flesh
- Adds missing flaws: Stench, Transparent, Unblinking Visage, Hopeless Addiction,
  Living in the Past, Archaic, Grief Phobia, Old Tricks, Bond Junkie, Bondslave,
  Two Masters, Methuselah's Thirst, Farmer, Organovore, Vein Tapper, Outdated
  Preference, Sloppy Feeder, Stake Bait, Starving Decay, Twice Cursed, Land Locked
- Fixes wrong category: Long Bond, Resonance Sensitivity, Resonance Mimic,
  Resistant Blush (all were seeded as merits but are flaws)

Run: docker compose exec backend python -m app.seed.fix_merits_flaws
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal
from app.models.game_data import Merit, Flaw
import app.models.user             # noqa: F401 — needed so SQLAlchemy resolves all relationships
import app.models.character        # noqa: F401
import app.models.condition        # noqa: F401
import app.models.group            # noqa: F401
import app.models.monster          # noqa: F401
import app.models.chronicle_note   # noqa: F401
import app.models.npc              # noqa: F401
import app.models.resonance        # noqa: F401
import app.models.dice             # noqa: F401
from app.models.character import CharacterMerit

# ── New merits to add ──────────────────────────────────────────────────────────
NEW_MERITS = [
    Merit(name="Semblance of the Methuselah", cost=1, category="looks", max_level=2,
        description="Your appearance is strikingly similar to a legendary Methuselah — a face many Kindred recognize from descriptions or portraits spanning centuries.",
        system_text="Gain one die on rolls to impress, intimidate, or attract the attention of those who recognize your face. At ••, gain additional Status or bonus dice when dealing directly with the Methuselah you resemble. Specify the Methuselah.",
        requires_custom_text=True),

    Merit(name="Custodian of History", cost=1, category="archaic",
        description="You carry deep knowledge of a specific period or figure in Kindred history, making you a living archive of the past.",
        system_text="Grants +1 to all relevant Skill tests pertaining to a chosen period or character in Kindred lore. Specify the period or figure."),

    Merit(name="Pack Diablerie", cost=2, category="mythic",
        description="When you participate in Diablerie — alone or with others — your nature ensures you always absorb the soul.",
        system_text="You are always the one to take the soul during Diablerie unless you deliberately choose otherwise. Additionally, if you assist another in consuming a soul, you gain 5 XP to spend in the same manner as if you had committed Diablerie personally."),

    Merit(name="Object of Power", cost=1, category="mythic", max_level=3,
        description="You possess a rare and potent item that defies mundane explanation — a relic, a bound spirit, or a fragment of something older and stranger.",
        system_text="•: Reroll one die per story (excluding Hunger dice). ••: Gain one bonus die to all Level 1 Ritual tests. •••: Receive a free premonition once per session — a warning that someone intends to cause you harm. The object is specific; if lost, benefits are lost with it.",
        requires_custom_text=True),

    Merit(name="Ley Line Leach", cost=1, category="mythic",
        description="You instinctively follow ancient paths of power across the land, drawing sustenance from the energy that flows beneath the earth.",
        system_text="After spending several hours traveling to a different city or locale, negate the need for a Rouse Check for the following night. This only triggers during meaningful travel, not local movement."),

    Merit(name="Corpse Flesh", cost=1, category="mythic",
        description="Your body is permanently settled into the death-state — cold, pallid, and utterly still. You have fully embraced the corpse you are.",
        system_text="Unable to use Blush of Life under any circumstances. Some may find your unambiguous undead appearance unsettling, but you need never spend Vitae maintaining a false mortal semblance."),
]

# ── New flaws to add ───────────────────────────────────────────────────────────
NEW_FLAWS = [
    # Looks
    Flaw(name="Stench", value=1, category="social",
        description="Your breath and body carry a supernaturally foul odor that mortals and Kindred alike find deeply repulsive.",
        system_text="Lose one die from seduction and similar Social pools. Lose two dice from Stealth pools unless you are upwind of your target."),

    Flaw(name="Transparent", value=1, category="mental",
        description="You are constitutionally unable to lie convincingly — either your face betrays you or a deep compulsion drives you toward honesty.",
        system_text="Lose one die in any pool requiring Subterfuge. You cannot take any dots in the Subterfuge Skill."),

    Flaw(name="Unblinking Visage", value=2, category="social",
        description="Something about the way you carry yourself — the stillness, the predatory focus — reads as deeply wrong to mortals when you attempt to appear alive.",
        system_text="Treat your Humanity as two lower (minimum 0) when using Blush of Life, eating, drinking, or engaging in sexual intercourse. The act always seems slightly off."),

    # Substance Use
    Flaw(name="Hopeless Addiction", value=2, category="mental",
        description="Your addiction is all-consuming. Even when you manage to function, the craving gnaws at every decision you make.",
        system_text="Specify the addiction. Lose two dice to all pools if the last feeding was not on the drug of your choice, unless the current action is to immediately obtain that drug.",
        requires_custom_text=True),

    # Archaic
    Flaw(name="Living in the Past", value=1, category="mental",
        description="You cannot fully grasp or accept the values of modern society. Your convictions reflect an older world that no longer exists.",
        system_text="One or more of your Convictions reflect outdated views incompatible with modern morality. The Storyteller may introduce complications when these views clash with the present."),

    Flaw(name="Archaic", value=2, category="mental",
        description="The modern world is alien and incomprehensible to you. Screens, networks, and devices may as well be sorcery.",
        system_text="Cannot use computers, smartphones, or modern communications technology. Your Technology rating is always 0 and cannot be increased."),

    Flaw(name="Grief Phobia", value=1, category="mental",
        description="A traumatically lost Touchstone haunts you. Certain objects or places that remind you of them trigger a flood of grief that cripples your focus.",
        system_text="Specify the phobic stimulus (an object, place, or type of person linked to the lost Touchstone). Lose one die to all tests made while in its presence."),

    Flaw(name="Old Tricks", value=1, category="mental",
        description="Your skills were honed centuries ago and you have never adapted them to the modern world.",
        system_text="All your Specialties must be Archaic in nature — reflecting pre-modern techniques, equipment, or contexts. You cannot take Specialties in modern applications."),

    # Bonding
    Flaw(name="Bond Junkie", value=1, category="mental",
        description="The sensation of a Blood Bond is intoxicating to you — you find it difficult to resist or resent those who hold your bond.",
        system_text="Lose one die when taking actions that directly oppose or resist a Blood Bond you are under."),

    Flaw(name="Bondslave", value=2, category="mental",
        description="Your blood responds to vampiric vitae with terrifying speed. What takes others three drinks takes you only one.",
        system_text="You become Blood Bonded to another Kindred after drinking their vitae only once (instead of three times). The bond forms immediately and at full strength."),

    Flaw(name="Two Masters", value=1, category="mental",
        description="Through unusual circumstance, you find yourself Blood Bound to two individuals simultaneously — a precarious and politically dangerous position.",
        system_text="You are Blood Bound to two separate Kindred at the same time. Both bonds are active and impose their effects. Acting against either bonded party requires extreme effort."),

    # Feeding
    Flaw(name="Methuselah's Thirst", value=1, category="feeding",
        description="Mortal blood barely registers to your palate. Only supernatural vitae — the blood of Kindred, werewolves, or other creatures — truly satisfies.",
        system_text="Your Hunger can only be slaked to 0 by supernatural blood. Mortal blood reduces Hunger normally but cannot bring it below 1."),

    Flaw(name="Farmer", value=2, category="feeding",
        description="You have an almost moral revulsion against feeding on human beings, preferring animals despite the lesser sustenance.",
        system_text="Must spend 2 Willpower Points to feed on human blood. Ventrue may not take this Flaw. Animal blood still provides less Vitae per feeding."),

    Flaw(name="Organovore", value=2, category="feeding",
        description="Blood alone does not satisfy you. You must consume human flesh and organs to slake your Hunger.",
        system_text="Can only reduce Hunger by consuming human flesh and organs along with blood. Feeding from a living vessel alone provides no Hunger reduction. This is a severe Masquerade risk."),

    Flaw(name="Vein Tapper", value=1, category="feeding",
        description="The intimacy of feeding is deeply personal to you — you find feeding from aware, consenting, or conscious victims profoundly uncomfortable.",
        system_text="You go out of your way to feed only from unaware, drugged, or unconscious victims. If forced to feed from a conscious mortal, lose one die to all pools for the rest of the scene."),

    Flaw(name="Outdated Preference", value=2, category="feeding",
        description="You can only feed satisfyingly from a very specific type of vessel that reflects a preference from your mortal life or early Kindred existence.",
        system_text="Specify the preference (e.g. a particular social class, ethnicity, profession, or era of person). You must either go to lengths to capture mortals of this type, or spend 1 Willpower to feed from anyone else.",
        requires_custom_text=True),

    Flaw(name="Sloppy Feeder", value=2, category="feeding",
        description="Your feeding style is distinctive — the bite patterns, the wounds, the circumstances — in ways that forensics can connect across incidents.",
        system_text="The pattern of your attacks when feeding is recognizable enough to be identified by investigators. Any one attack can be forensically linked to previous attacks, creating an accumulating risk to the Masquerade."),

    # Mythic
    Flaw(name="Stake Bait", value=2, category="mythic",
        description="For you, the old superstition is literal truth — a wooden stake through the heart does not paralyze you. It kills you.",
        system_text="When staked through the heart, you do not enter torpor — you meet Final Death. Those who know this flaw have a decisive advantage over you."),

    Flaw(name="Starving Decay", value=2, category="mythic",
        description="Hunger does not just gnaw at your mind — it shows on your body. As your Hunger rises, your flesh shrinks and rots.",
        system_text="When your Hunger is 3 or higher, your body visibly shrivels and decays. Suffer a two-dice penalty to Physical tests and to social interactions with mortals. At Hunger 4+, your appearance is a Masquerade risk."),

    Flaw(name="Twice Cursed", value=2, category="mythic",
        description="You suffer not one but two expressions of your clan's curse — perhaps a throwback to an older strain, or simply the depth of your damnation.",
        system_text="Take your clan's variant Bane in addition to the standard Bane. The Storyteller may prohibit this Flaw if the second Bane would not mesh meaningfully with the chronicle."),

    Flaw(name="Land Locked", value=1, category="mythic",
        description="Something fundamental in your undead nature binds you to land. Open water fills you with primal terror.",
        system_text="Cannot willingly leave the land. Must make a Fear Frenzy test at Difficulty 3 to board a boat, plane, or any vessel that takes you over open water. Failure means immediate frenzy."),

    Flaw(name="Resistant Blush", value=1, category="mythic",
        description="Your body resists the call to simulate life. Even with effort, the Blush of Life comes reluctantly.",
        system_text="When making a Rouse Check to activate Blush of Life, roll twice and take the lowest result."),
]

# ── Merits that are actually flaws (need to move) ─────────────────────────────
WRONG_MERITS = [
    # (merit_name, flaw_to_create)
    ("Long Bond", Flaw(name="Long Bond", value=1, category="bonding",
        description="Blood bonds that affect you are unusually deep and persistent, fading far more slowly than they should.",
        system_text="Bonds you are subject to decrease in strength only once every 3 months without reinforcement, rather than monthly. The emotional experience is more intense, making it harder to act against those who hold your bond.")),

    ("Resonance Sensitivity", Flaw(name="Resonance Sensitivity", value=1, category="feeding",
        description="One particular blood resonance interacts with your psychology in a deeply destabilizing way, triggering a unique compulsion.",
        system_text="Specify the resonance that affects you. When you feed on a vessel with that resonance, you gain a unique Compulsion appropriate to that resonance for the rest of the scene.",
        requires_custom_text=True)),

    ("Resonance Mimic", Flaw(name="Resonance Mimic", value=2, category="feeding",
        description="You absorb not just blood but the memories and emotions of your victims, which bleed into your own behavior in unwanted ways.",
        system_text="After feeding, you may be influenced and penalized by the memories of your victim. The Storyteller may impose dice penalties or behavioral compulsions reflecting the victim's dominant emotional state for the rest of the scene.")),
]


def fix():
    db = SessionLocal()
    try:
        added_merits = 0
        added_flaws = 0
        fixed = 0

        # ── Add missing merits ─────────────────────────────────────────────────
        for merit in NEW_MERITS:
            exists = db.query(Merit).filter(Merit.name == merit.name).first()
            if not exists:
                db.add(merit)
                print(f"[MERIT +] {merit.name}")
                added_merits += 1
            else:
                print(f"[MERIT  ] {merit.name} — already exists, skipping")

        # ── Add missing flaws ──────────────────────────────────────────────────
        for flaw in NEW_FLAWS:
            exists = db.query(Flaw).filter(Flaw.name == flaw.name).first()
            if not exists:
                db.add(flaw)
                print(f"[FLAW  +] {flaw.name}")
                added_flaws += 1
            else:
                print(f"[FLAW   ] {flaw.name} — already exists, skipping")

        db.flush()

        # ── Fix wrong-category merits → move to flaws ─────────────────────────
        for merit_name, new_flaw in WRONG_MERITS:
            merit = db.query(Merit).filter(Merit.name == merit_name).first()
            if not merit:
                print(f"[SKIP   ] {merit_name} — not found in merits, skipping")
                continue

            # Check if any characters are using this merit
            char_count = db.query(CharacterMerit).filter(CharacterMerit.merit_id == merit.id).count()
            if char_count > 0:
                print(f"[WARN   ] {merit_name} — {char_count} character(s) have this merit; cannot move safely. Leaving as-is.")
                continue

            # Safe to remove and re-create as flaw
            flaw_exists = db.query(Flaw).filter(Flaw.name == new_flaw.name).first()
            if not flaw_exists:
                db.delete(merit)
                db.flush()
                db.add(new_flaw)
                print(f"[FIX    ] {merit_name} — removed from merits, added to flaws")
                fixed += 1
            else:
                db.delete(merit)
                db.flush()
                print(f"[FIX    ] {merit_name} — removed from merits (flaw already exists)")
                fixed += 1

        db.commit()
        print(f"\nDone.")
        print(f"  Added merits: {added_merits}")
        print(f"  Added flaws:  {added_flaws}")
        print(f"  Fixed (merit→flaw): {fixed}")
        print(f"  Total merits: {db.query(Merit).count()}")
        print(f"  Total flaws:  {db.query(Flaw).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix()
