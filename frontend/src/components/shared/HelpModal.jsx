import { useState } from "react";

const SECTIONS = {
  player: {
    label: "Player",
    color: "text-blood",
    steps: [
      { title: "Register", body: "Create an account and choose the Player role. You will be taken straight into the Character Creation Wizard." },
      { title: "Character Creation Wizard", body: "Complete 10 steps to build your vampire: name & concept, clan, predator type, attributes, skills, disciplines, advantages, beliefs, humanity, and generation. You can save a draft at any step and return later." },
      { title: "Character Sheet", body: "After creation, your dashboard shows your character sheet. You can view stats, spend XP to improve skills and disciplines, track health and willpower, and manage weapons." },
      { title: "Dice Roller", body: "Use the dice roller button in the top bar. Enter regular dice and hunger dice. Results show successes, criticals, messy criticals, and bestial failures per V5 rules." },
      { title: "Player Directory", body: "Browse other players' characters via the Directory link. You can filter by clan and view character sheets in read-only mode." },
      { title: "Session Mode", body: "When your GM starts a session, you will see a session indicator. Your dice rolls are visible to the GM in real time." },
    ],
  },
  gm: {
    label: "Game Master",
    color: "text-amber-400",
    steps: [
      { title: "Register", body: "Create an account and choose the GM role. You go straight to the GM Dashboard — no character creation." },
      { title: "Create a Group", body: "Click the + button in the left sidebar to create a group. Give it a name and optional description." },
      { title: "Add Players", body: "Select a group, go to the Characters or Players tab, and click Add Player. Search by username, select the player, then pin a specific character for the group." },
      { title: "Pin Characters", body: "In the Players tab, each member row shows their pinned character. Click Change or 📌 Pin to select which character they play in this group. Without a pin, no character card is shown in the grid." },
      { title: "Character Grid", body: "The Characters tab shows all pinned characters as cards. Click any card to open a full read-only character sheet. Hover to reveal the remove button." },
      { title: "Monsters", body: "Use the Monsters tab to create and manage NPCs and monsters for the group. Each monster has health, attributes, attack, and special abilities." },
      { title: "Session Mode", body: "Click Session Mode to open a live view. You can see all player dice rolls in real time as they happen." },
      { title: "Dice Roller", body: "The Dice Roller button in the top bar is available at all times. Your rolls are private to you unless in session mode." },
    ],
  },
  admin: {
    label: "Admin",
    color: "text-gray-300",
    steps: [
      { title: "Access", body: "Admin accounts are not selectable during registration. An admin must be created via backend CLI: docker compose exec backend python -m app.seed.create_admin (or directly in the DB)." },
      { title: "System Overview", body: "The Admin Sanctum shows live counts of users, players, GMs, admins, groups, characters, and monsters." },
      { title: "User Management", body: "The Kindred Registry table lists all users. You can change any user's role (player / gm / admin) or toggle their active status. You cannot edit your own account here." },
      { title: "Delete User", body: "Click the ✕ button on any user row. This permanently deletes the user and all their data. A confirmation prompt appears first." },
      { title: "Seed Game Data", body: "Use the Seed Game Data button to populate clans, disciplines, powers, merits, flaws, and predator types. Safe to run multiple times — it skips data that already exists." },
    ],
  },
};

export default function HelpModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("player");
  const section = SECTIONS[activeTab];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-void-light border border-void-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-void-border shrink-0">
          <div>
            <h2 className="font-gothic text-blood text-xl tracking-widest">Scriptorium Guide</h2>
            <p className="text-gray-600 text-xs mt-0.5 tracking-wider uppercase">How to use this system</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Role tabs */}
        <div className="flex border-b border-void-border shrink-0">
          {Object.entries(SECTIONS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-sm font-gothic tracking-wider transition-colors capitalize ${
                activeTab === key
                  ? `${s.color} border-b-2 border-current`
                  : "text-gray-600 hover:text-gray-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {section.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-gothic ${section.color} border-current mt-0.5`}>
                {i + 1}
              </div>
              <div>
                <p className={`font-gothic text-sm tracking-wide ${section.color}`}>{step.title}</p>
                <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-void-border shrink-0">
          <p className="text-gray-700 text-xs text-center">VTM-GG — Vampire: The Masquerade 5e Companion</p>
        </div>
      </div>
    </div>
  );
}
