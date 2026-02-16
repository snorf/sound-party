# Sound Party

A kid-friendly webapp that shows a grid of animals and vehicles. When a child taps a tile, Alexa makes the corresponding sound — powered by [Homey Pro](https://homey.app/).

## How It Works

```
iPad → Express server → Homey REST API → Flow → Alexa "Tell"
```

The Express server serves the frontend and proxies requests to Homey, keeping the API key server-side.

## Setup

### 1. Homey Configuration

**Create a Logic variable:**
- Go to Homey → Logic → Variables
- Create a new variable named `sound_command` (type: **string**)
- Note the variable ID (see step 3)

**Create a flow:**
- Trigger: **"This flow is started"** (allows API triggering)
- Action: Alexa → **"Tell"** → use the `sound_command` tag as the text
- Save the flow

**Create an API key:**
- Go to Homey → Settings → API Keys
- Create a new key with permissions for: **Logic**, **Flows**, **Devices**
- Copy the generated token

### 2. Find Your IDs

With your API key, query the Homey API to find the variable and flow IDs:

```bash
# List variables
curl -s http://<HOMEY_IP>/api/manager/logic/variable/ \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool

# List flows
curl -s http://<HOMEY_IP>/api/manager/flow/flow/ \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
```

### 3. Configure .env

```bash
cp .env.example .env
```

Fill in your values:

```env
HOMEY_IP=192.168.1.xxx        # Your Homey's local IP
HOMEY_TOKEN=<api-key-token>   # From step 1
VARIABLE_ID=<uuid>            # sound_command variable ID
FLOW_ID=<uuid>                # Your flow ID
PORT=3000
```

### 4. Run

**Local:**
```bash
npm install
npm start
```

**Docker:**
```bash
docker compose up -d
```

Open `http://localhost:3000` on your iPad and tap away!

### 5. Add to Home Screen (iPad)

Open the URL in Safari → tap Share → **Add to Home Screen**. The app runs fullscreen without browser chrome.

## Customizing Sounds

Edit `public/sounds.json` to add, remove, or change sounds. Each item has:

```json
{ "label": "Ko", "emoji": "🐄", "command": "sound like a cow" }
```

- `label` — displayed text (Swedish)
- `emoji` — tile icon
- `command` — English text sent to Alexa

Add `"mystery": true` for a random-pick tile per category.
