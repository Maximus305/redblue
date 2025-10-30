# Clone Game - Web Player Interface Documentation (Redblue)

> **IMPORTANT**: This documentation covers the **Web Player Interface** only (the "redblue" codebase).
>
> There is a separate **Host/Main App** (React Native/iOS) that handles:
> - Room creation and QR code generation
> - Game setup and topic selection
> - Master/host controls
> - Asking questions (or managing questioning)
> - Revealing responses
> - Showing game state to the room
>
> **This app (redblue)** is for **players joining via QR code** to participate in the game.

## Table of Contents
1. [Overview](#overview)
2. [Two-App Architecture](#two-app-architecture)
3. [Game Flow (Player Perspective)](#game-flow-player-perspective)
4. [Components & Files](#components--files)
5. [Data Models](#data-models)
6. [Player Roles](#player-roles)
7. [Game Phases](#game-phases)
8. [Firebase Structure](#firebase-structure)
9. [AI Clone Generation](#ai-clone-generation)
10. [Key Functions](#key-functions)

---

## Overview

Clone is a party game where players create AI clones of themselves, and teams try to guess if a response is from a real human or their AI clone. It's a human vs AI detection challenge.

**Concept**: Players answer questions either as themselves OR use their AI-generated response. The opposing team votes to guess whether it was the human or the clone.

---

## Two-App Architecture

The Clone game system consists of **TWO SEPARATE APPLICATIONS**:

### 1. Host/Main App ("Main Guy")
**Platform**: React Native / iOS
**Platform Identifier**: `'rn'`
**Purpose**: Game Master Interface

**Responsibilities:**
- Creates rooms with unique codes (e.g., "ABCD-EFGH")
- Generates QR codes for players to join
- Selects game topic (Food, Travel, Hobbies, etc.)
- Initializes game via `initializeCloneGame()`
- Manages questioning flow
- Reveals responses to teams
- Shows game state on main screen
- Tracks scores and declares winners

**Key Files** (in main app):
- `app/clone.tsx` - Host setup screen
- `app/cloneplay.tsx` - Host gameplay interface
- `services/clone.ts` - Shared game logic

### 2. Web Player App ("Redblue" - THIS CODEBASE)
**Platform**: Next.js / Web
**Platform Identifier**: `'web'`
**Purpose**: Player Join & Play Interface

**Responsibilities:**
- Players scan QR code → land on `/clone/[roomId]`
- Players enter their name
- Players join lobby as members
- Players create their AI clone profiles
- Players respond to questions
- Players vote on responses
- Players see their role-specific UI

**Key Files** (in this app):
- `src/app/clone/[roomId]/page.tsx` - QR code join page
- `src/app/cloneplay/page.tsx` - Player gameplay interface
- `src/services/clone.ts` - Game logic (synced with main app)
- `src/services/lobby.ts` - Lobby/member management
- `src/app/api/generate-clone-response/route.ts` - AI generation endpoint

### Communication Between Apps

**Both apps communicate through Firebase Firestore:**

```
Firebase Firestore (Shared Database)
├── rooms/{roomId}               ← Both apps read/write
│   └── members/{memberId}       ← Web app writes, Main app reads
├── clone_games/{roomId}         ← Both apps read/write
└── settings/{roomId}            ← Main app writes, Web app reads
```

**Real-time sync ensures:**
- When a player joins via web → Main app sees them in lobby
- When host starts game → Web players navigate to gameplay
- When a player responds → Main app shows it for voting
- When host advances round → Web players see next question

---

## Game Flow (Player Perspective)

This section describes what **web players** (using this codebase) experience:

### 1. Joining the Game
```
Player scans QR code from host's screen
  ↓
Navigate to /clone/ABCD-EFGH
  ↓
Enter name
  ↓
Added to lobby members
  ↓
Wait in lobby (see other players joining)
```

**File**: `src/app/clone/[roomId]/page.tsx`

### 2. Clone Creation
```
Host starts game → Web players redirected to /cloneplay
  ↓
Player sees "Create Your Clone" screen
  ↓
Player describes themselves in text area
  ↓
Submit → Profile saved to Firebase
  ↓
Wait for all players to complete profiles
```

**File**: `src/app/cloneplay/page.tsx` (Clone creation screen)

### 3. Playing the Game

**Players see different UI based on their role:**

#### If you're the RESPONDER (being questioned):
```
See the question
  ↓
AI clone response auto-generates
  ↓
Choose: Type human response OR Use clone response
  ↓
Submit choice
  ↓
Wait for voting
```

#### If you're a VOTER (questioning team):
```
See the response
  ↓
Vote: Human or Clone?
  ↓
Wait for results
```

#### If you're a SPECTATOR:
```
Watch and wait
See informative status messages
```

### 4. Between Rounds
```
See results (correct/incorrect)
  ↓
See scores update
  ↓
Auto-advance to next round
  ↓
Repeat until all players questioned
```

---

## Architecture (Web Player App)

The web player interface is built using:
- **Frontend**: Next.js 14+ (React with TypeScript)
- **Backend**: Firebase Firestore (real-time database, shared with main app)
- **AI**: OpenAI GPT-3.5-turbo API (web app hosts this endpoint)
- **State Management**: Real-time listeners with Firebase

### Key Services (Web App)
1. **LobbyService** (`src/services/lobby.ts`) - Member management and joining
2. **CloneGameService** (`src/services/clone.ts`) - Game logic and state (synced with main app)
3. **PlayerRoles** (`src/utils/playerRoles.ts`) - Role determination and UI rendering

---

## Game Flow

### 1. Room Creation & Joining
```
Host creates room → Room ID generated (e.g., "ABCD-EFGH")
Players scan QR code → Navigate to /clone/[roomId]
Players enter name → Added to lobby as members
```

### 2. Clone Creation Phase
```
Each player creates their clone profile by providing:
- Personality traits
- Favorite things
- Background info
- Speech patterns

This data is saved to Firebase and used by AI to generate responses
```

### 3. Team Assignment
```
Players are automatically balanced into Team A (Red) and Team B (Blue)
Teams alternate between questioning and responding roles
```

### 4. Gameplay Loop
```
Round 1: Team A questions → Team B player responds
Round 2: Team B questions → Team A player responds
Round 3: Team A questions → Team B player responds
...and so on

Each round:
1. QUESTIONING PHASE
   - Team leader asks a question
   - System generates AI clone response immediately

2. WAITING_FOR_RESPONSE PHASE
   - Current player sees:
     * The question
     * Their AI-generated clone response
     * A text box to write their human response
   - Player chooses: Human response OR Clone response

3. MASTER_REVIEW PHASE
   - Host reviews player's chosen response
   - Prepares to reveal to questioning team

4. VOTING PHASE
   - Questioning team sees the response
   - Team leader votes: Human or Clone?
   - Vote is recorded

5. RESULTS PHASE
   - Reveal what it actually was
   - Award points if team guessed correctly
   - Auto-advance to next round
```

### 5. Scoring
- Questioning team earns 1 point for correct guess
- Game continues until host ends it
- Team with most points wins

---

## Components & Files

### Page Components

#### `/src/app/clone/page.tsx`
**Old standalone page** - Contains its own join/create clone flow with Firebase API calls built-in. This is a legacy entry point.

**Key Features:**
- Join room interface
- Clone profile creation form (4 textarea fields)
- Waiting room with team display
- Basic gameplay interface

**Routes in this file:**
- Join screen → Clone creation → Waiting room → Playing

#### `/src/app/clone/[roomId]/page.tsx`
**Primary join page** - Dynamic route for joining specific rooms via QR code.

**Key Features:**
- Verifies room exists and is active
- Prompts for player name
- Adds player to lobby members
- Auto-redirects to `/cloneplay` when game starts
- Shows waiting lobby with:
  * List of all members
  * Team assignments (if ready)
  * Platform indicators (Web/Mobile)
  * Clone profile status (checkmarks)

**Location**: `/clone/ABCD-EFGH` (where ABCD-EFGH is the room ID)

#### `/src/app/cloneplay/page.tsx`
**Main gameplay interface** - The actual game experience for players.

**Key Features:**
- Receives `roomId` and `playerId` from URL params
- Real-time game state synchronization
- Role-based UI rendering:
  * **QUESTIONER**: Show question input form
  * **RESPONDER**: Show response selection (Human vs Clone)
  * **VOTER**: Show voting buttons (Human vs Clone)
  * **SPECTATOR**: Show waiting screen with game status
- Platform tracking (updates player online status every 30s)
- Auto-generates AI responses when questions are asked
- Handles response submission with choice tracking

**Rendered Screens:**
```
joining → creating-clone → waiting → playing
```

### API Routes

#### `/src/app/api/generate-clone-response/route.ts`
**AI Response Generator** - POST endpoint that generates clone responses.

**Input:**
```typescript
{
  cloneData: string,    // Player's clone profile
  question: string,     // The question asked
  topic?: string        // Optional topic context
}
```

**Output:**
```typescript
{
  response: string      // AI-generated response (1-2 sentences)
}
```

**Process:**
1. Validates input (requires cloneData and question)
2. Checks for OpenAI API key
3. Calls OpenAI GPT-3.5-turbo with:
   - System prompt: "You are impersonating this person..."
   - User prompt: The question
   - Temperature: 0.8 (for natural variation)
   - Max tokens: 100 (keep responses short)
4. Falls back to personality-based responses if API fails

**Fallback Generator:**
- Analyzes clone data for personality keywords
- Selects appropriate response style:
  * Sarcastic responses for sarcastic personalities
  * Funny responses for humorous personalities
  * Thoughtful responses for deep thinkers
  * Energetic responses for outgoing types
  * Professional responses for serious types
  * Default responses if no match

---

## Data Models

### ClonePlayer
```typescript
interface ClonePlayer {
  id: string;                    // Unique player ID
  name: string;                  // Display name
  teamId: 'A' | 'B';            // Red or Blue team
  hasCloneProfile: boolean;      // Profile creation status
  cloneInfo?: string;            // Clone personality data
  isHost: boolean;               // Host flag
  platform: 'web' | 'ios';      // Platform type
  joinedAt: Timestamp;           // Join timestamp
}
```

### CloneGameState
```typescript
interface CloneGameState {
  // Phase management
  gamePhase: 'team_assignment' | 'clone_creation' | 'questioning' |
             'waiting_for_response' | 'master_review' | 'voting' | 'results';

  // Round tracking
  roundNumber: number;
  topic: string;

  // Current turn
  currentPlayer?: string;           // Player being questioned
  questioningTeam?: 'A' | 'B';     // Team asking questions
  playersAnswered?: string[];      // Tracking who has been questioned

  // Question & response
  currentQuestion?: string;
  questionAskedAt?: Timestamp;
  awaitingResponse?: boolean;
  responseReady?: boolean;

  // Player's responses
  playerResponse?: string;          // What was shown to everyone
  humanResponse?: string;           // Human-written response
  cloneResponse?: string;           // AI-generated response
  usedClone?: boolean;             // What player actually chose
  responseSubmittedAt?: Timestamp;

  // Voting
  votes?: {
    human?: string[];              // Player IDs who voted human
    clone?: string[];              // Player IDs who voted clone
  };
  playerVotes?: { [playerId: string]: 'human' | 'clone' };
  votesSubmitted?: number;
  totalVoters?: number;

  // Results
  roundResult?: {
    guess: 'human' | 'clone';
    actual: 'human' | 'clone';
    correct: boolean;
    humanVotes: number;
    cloneVotes: number;
  };

  // Scores
  teamAScore: number;
  teamBScore: number;

  // Players array
  players: ClonePlayer[];

  // Metadata
  lastUpdated: Timestamp;
}
```

### Member (Lobby)
```typescript
interface Member {
  memberId: string;
  displayName: string;
  roomId: string;
  role: 'host' | 'player';
  platform: 'rn' | 'web';         // React Native or Web
  joinedAt?: Timestamp;

  // Clone-specific fields
  teamId?: 'A' | 'B';
  hasCloneProfile?: boolean;
  cloneInfo?: string;
}
```

---

## Player Roles

The system uses dynamic role assignment based on game state and team leadership.

### Role Types
```typescript
type PlayerRole = 'QUESTIONER' | 'RESPONDER' | 'VOTER' | 'SPECTATOR';
```

### Team Leadership
**Team Leader** = First person to join each team (sorted by `joinedAt` timestamp)

**Special Cases:**
- If only 2 total players: Both are always active (no spectators)
- If 3+ players: Team leaders ask questions and vote

### Role Determination (`determinePlayerRole`)

**During QUESTIONING phase:**
- Current player being questioned → `RESPONDER`
- Questioning team leader → `QUESTIONER` (if no question yet)
- All others → `SPECTATOR`

**During WAITING_FOR_RESPONSE phase:**
- Current player → `RESPONDER`
- All others → `SPECTATOR`

**During VOTING phase:**
- Questioning team leader → `VOTER`
- All others → `SPECTATOR`

**During RESULTS phase:**
- Everyone → `SPECTATOR`

### Important Functions

#### `isTeamLeader(gameState, playerId)`
Determines if player is their team's leader based on earliest join time.

#### `determinePlayerRole(gameState, myPlayerId)`
Returns current role based on game phase, team, and position.

#### `canPlayerAct(gameState, myPlayerId, action)`
Validates if player can perform an action (question/respond/vote).

---

## Game Phases

### 1. team_assignment
- Players are auto-balanced between Team A and Team B
- Uses shuffle + alternating assignment

### 2. clone_creation
- Each player describes themselves in a text area
- Data saved to both:
  * `rooms/{roomId}/members/{playerId}` (lobby)
  * `clone_games/{roomId}/players` array (game state)
- Game waits until all players have `hasCloneProfile: true`

### 3. questioning
- Team leader asks a question
- System immediately generates AI clone response
- Transition to `waiting_for_response`

### 4. waiting_for_response
- Current player sees question + both response options
- Chooses Human (type your own) or Clone (use AI)
- Submits choice → transition to `master_review`

### 5. master_review
- Host/Master sees player's chosen response
- Can reveal it when ready → transition to `voting`

### 6. voting
- Questioning team leader votes Human or Clone
- System tracks votes from all voting-eligible players
- When all votes in → auto-calculate results

### 7. results
- Show what it actually was
- Show if team guessed correctly
- Award points if correct
- Auto-advance to next round after 3 seconds

---

## Firebase Structure

```
firestore/
├── rooms/
│   └── {roomId}/                    # e.g., "ABCD-EFGH"
│       ├── (document fields)
│       │   ├── roomId: string
│       │   ├── active: boolean
│       │   ├── hostId: string
│       │   ├── gameMode: "clone" | "spy" | "teams"
│       │   ├── gameState: "waiting" | "playing" | "finished"
│       │   ├── createdAt: timestamp
│       │   └── lastActivity: timestamp
│       │
│       └── members/                 # Subcollection
│           └── {memberId}/
│               ├── memberId: string
│               ├── displayName: string
│               ├── role: "host" | "player"
│               ├── platform: "rn" | "web"
│               ├── teamId?: "A" | "B"
│               ├── hasCloneProfile?: boolean
│               ├── cloneInfo?: string
│               └── joinedAt: timestamp
│
├── clone_games/
│   └── {roomId}/                    # Same roomId as rooms
│       ├── gamePhase: string
│       ├── roundNumber: number
│       ├── topic: string
│       ├── currentPlayer?: string
│       ├── questioningTeam?: "A" | "B"
│       ├── currentQuestion?: string
│       ├── playerResponse?: string
│       ├── humanResponse?: string
│       ├── cloneResponse?: string
│       ├── usedClone?: boolean
│       ├── votes?: object
│       ├── roundResult?: object
│       ├── teamAScore: number
│       ├── teamBScore: number
│       ├── players: array
│       └── lastUpdated: timestamp
│
└── settings/
    └── {roomId}/
        ├── gameStarted: boolean
        ├── gameMode: "clone" | "spy" | "teams"
        └── ...other settings
```

---

## AI Clone Generation

### Process Flow

1. **Profile Creation** (`/clone` or `/cloneplay`)
   - Player enters personality description
   - Saved to `member.cloneInfo` in Firebase

2. **Question Asked** (`CloneGameService.submitQuestion`)
   - Calls `generateCloneResponse(cloneInfo, question, topic)`
   - Returns AI response immediately
   - Stored in `gameState.cloneResponse`

3. **API Call** (`/api/generate-clone-response`)
   ```typescript
   // System prompt construction
   const systemPrompt = `
     You are playing a party game where you need to impersonate a person
     based on their personality description.

     Personality description: ${cloneData}

     Answer questions as if you are this person. Keep responses natural,
     conversational, and 1-2 sentences max. Don't be too obvious or use
     exact words from the personality description. Be subtle and authentic
     to how a real person would answer.
   `;
   ```

4. **OpenAI Parameters**
   - Model: `gpt-3.5-turbo`
   - Temperature: `0.8` (creative but not random)
   - Max tokens: `100` (force brevity)

5. **Fallback System**
   - If API fails or no API key
   - Analyzes cloneData for keywords
   - Selects response from personality-matched templates

### Example Clone Data
```
"I'm outgoing and sarcastic, love pizza and sci-fi movies,
grew up in NYC, and I always say 'no way!' when surprised."
```

### Example Generated Response
**Question:** "What's your favorite food?"
**AI Clone:** "Pizza, hands down. No way you're catching me eating anything else on a Friday night!"

---

## Key Functions

### CloneGameService Methods

#### `initializeCloneGame(roomId, hostId)`
- Creates clone_games document
- Gets members from lobby
- Auto-balances teams
- Sets initial game state to `clone_creation`

**Location**: `src/services/clone.ts:184`

---

#### `saveCloneData(roomId, playerId, personalityText)`
- Saves clone profile to lobby member
- Updates clone game player array
- Sets `hasCloneProfile: true`
- Checks if all players ready

**Location**: `src/services/clone.ts:398`

---

#### `startCloneGame(roomId)`
- Validates all players have clone profiles
- Selects first Team B player as responder
- Sets Team A as questioning team
- Transitions to `questioning` phase

**Location**: `src/services/clone.ts:466`

---

#### `submitQuestion(roomId, question)`
- Master/host submits question
- Generates AI clone response immediately
- Transitions to `waiting_for_response`
- Stores both question and clone response

**Location**: `src/services/clone.ts:530`

---

#### `submitPlayerResponse(roomId, playerId, choice, humanAnswer, aiResponse)`
- Player submits their chosen response
- Stores what was chosen ('human' or 'clone')
- Stores both possible responses
- Sets `responseReady: true`
- Transitions to `master_review`

**Location**: `src/services/clone.ts:636`

---

#### `revealResponse(roomId)`
- Master reveals response to questioning team
- Transitions to `voting` phase
- Clears previous votes

**Location**: `src/services/clone.ts:673`

---

#### `submitVote(roomId, playerId, vote)`
- Player submits vote ('human' or 'clone')
- Updates vote counts
- When all votes in → auto-calculate results

**Location**: `src/services/clone.ts:711`

---

#### `calculateVotingResults(roomId)`
- Counts votes (human vs clone)
- Determines majority guess
- Checks if correct
- Awards points to questioning team if correct
- Transitions to `results`
- Auto-advances to next round after 3s

**Location**: `src/services/clone.ts:776`

---

#### `nextRound(roomId)`
- Alternates questioning team (A ↔ B)
- Selects next player from opposite team
- Tracks which players have been questioned
- Clears previous round data
- Increments round number
- Transitions to `questioning`

**Location**: `src/services/clone.ts:899`

---

#### `listenToCloneGame(roomId, callback)`
- Real-time Firestore listener
- Auto-validates game state
- Fixes invalid states (e.g., team questioning own player)
- Syncs new members if detected
- Calls callback with latest game state

**Location**: `src/services/clone.ts:972`

---

#### `validateAndFixCloneProfiles(roomId, gameData)`
- Checks all players have clone profiles
- Fixes inconsistencies between flag and data
- Restores missing data from lobby if possible
- Forces return to `clone_creation` if profiles incomplete

**Location**: `src/services/clone.ts:289`

---

### LobbyService Methods

#### `createRoom(hostId, hostName)`
- Generates unique room code (e.g., "ABCD-EFGH")
- Creates room document
- Adds host as first member
- Returns roomId

**Location**: `src/services/lobby.ts:66`

---

#### `joinRoom(roomId, memberId, displayName, platform)`
- Validates room exists and is active
- Adds player to members subcollection
- Updates room last activity

**Location**: `src/services/lobby.ts:103`

---

#### `updateMember(roomId, memberId, updates)`
- Updates member document with partial data
- Used for team assignment, clone profile, etc.
- Creates document if doesn't exist

**Location**: `src/services/lobby.ts:309`

---

#### `listenToRoom(roomId, callback)`
- Real-time listener for room + members
- Returns lobby state with all members
- Includes team assignments and clone status

**Location**: `src/services/lobby.ts:166`

---

## Complete User Journey

### Player Journey

1. **Join Room**
   - Scan QR code → `/clone/ABCD-EFGH`
   - Enter name → Added to lobby
   - Wait in lobby, see other players joining

2. **Create Clone**
   - Host starts game → Navigate to `/cloneplay?roomId=ABCD-EFGH&playerId=xyz`
   - See "Create Your Clone" screen
   - Describe yourself in text area
   - Submit → Move to waiting room

3. **Wait for Game Start**
   - See teams assigned (Team A/Red or Team B/Blue)
   - See which players have created clones (checkmarks)
   - Wait for host to start

4. **Play Game**
   - **If QUESTIONER**: Type question, submit
   - **If RESPONDER**: See question → Choose Human or Clone → Submit
   - **If VOTER**: See response → Vote Human or Clone
   - **If SPECTATOR**: Watch and wait

5. **See Results**
   - View round results (correct/incorrect guess)
   - See scores update
   - Auto-advance to next round

### Host/Master Journey

1. **Create Room**
   - Generate room code
   - Share QR code with players

2. **Manage Lobby**
   - See players joining
   - Start game when ready

3. **Initialize Clone Game**
   - System creates game state
   - Assigns teams automatically

4. **Manage Rounds**
   - Ask questions (or team leaders ask)
   - Reveal responses
   - Observe voting
   - See results
   - Continue to next round

---

## Important Notes

### Team Assignment Logic
- **Automatic**: Players are shuffled and alternately assigned
- **Balanced**: Equal distribution between teams
- **Dynamic**: New joiners are assigned to smaller team

### Clone Profile Validation
- System validates profiles before starting game
- Fixes inconsistencies automatically
- Forces return to creation phase if data missing

### Role-Based UI
- UI changes based on player's current role
- Each screen shows only relevant actions
- Spectators see informative waiting screens

### Real-Time Sync
- All game state updates are real-time via Firestore
- Players see changes immediately
- Auto-advances between phases

### Error Handling
- Comprehensive validation at each step
- Auto-fix for common issues
- Fallback AI responses if API fails

---

## Technical Details

### State Management
- Firebase Firestore real-time listeners
- Local state in React components
- Real-time sync across all connected clients

### Security
- Room validation before joining
- Host-only actions protected
- Player action validation before execution

### Performance
- Firestore queries optimized for subcollections
- Real-time listeners with cleanup
- Debounced API calls where appropriate

### Browser Compatibility
- Works on modern browsers (Chrome, Safari, Firefox, Edge)
- Mobile web support
- iOS app integration via React Native

---

## Summary

The Clone game is a sophisticated multiplayer party game that:
1. Uses AI to create digital twins of players
2. Challenges teams to detect human vs AI responses
3. Manages complex game state with role-based interactions
4. Provides real-time synchronized gameplay
5. Automatically handles team balancing and turn rotation
6. Offers fallback systems for reliability
7. Validates and fixes data inconsistencies

The architecture separates concerns cleanly:
- **Lobby** manages players and rooms
- **Clone Game** manages gameplay logic
- **Player Roles** determines what each player can do
- **AI API** generates clone responses
- **Firebase** provides real-time database

This creates a seamless, engaging experience where players compete to fool each other's teams with their AI clones!
