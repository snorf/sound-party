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

## Deployment on Proxmox

Two options: **LXC container** (recommended) or **VM**. LXC is lighter, faster to boot, and uses less resources — perfect for a simple Docker workload like this.

### Option A: LXC Container (Recommended)

#### 1. Create the LXC

In the Proxmox web UI:

1. Click **Create CT** (top right)
2. Fill in the **General** tab:
   - **Hostname:** `sound-party`
   - **Password:** choose a root password
   - Leave **Unprivileged container** checked (default, more secure)
3. **Template:** pick an Ubuntu template (e.g. `ubuntu-24.04-standard`). If you don't have one, first go to your storage → **CT Templates** → **Templates** and download it.
4. **Disks:** 4 GB is plenty
5. **CPU:** 1 core
6. **Memory:** 256 MB (RAM), 256 MB (Swap)
7. **Network:** select your VLAN bridge so the container can reach Homey and your iPad can reach port 3000. Use DHCP or set a static IP.
8. **DNS:** leave defaults (uses host settings)
9. Click **Finish** but **don't start it yet**

| Resource | Recommended |
|----------|-------------|
| CPU      | 1 core      |
| RAM      | 256 MB      |
| Disk     | 4 GB        |
| Network  | VLAN bridge with access to Homey |

#### 2. Enable nesting (required for Docker)

Select the container → **Options** → **Features** → check **nesting**. This lets Docker run inside the LXC.

Alternatively via CLI on the Proxmox host:

```bash
# Replace 100 with your container ID
pct set 100 -features nesting=1
```

#### 3. Start and enter the container

```bash
pct start 100
pct enter 100
```

Or use the **Console** tab in the web UI.

#### 4. Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
apt install -y ca-certificates curl gpg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

> **Note:** In LXC you're already root, so no `sudo` needed.

#### 5. Clone and configure

```bash
git clone <your-repo-url> ~/sound-party
cd ~/sound-party
cp .env.example .env
nano .env   # Fill in HOMEY_IP, HOMEY_TOKEN, VARIABLE_ID, FLOW_ID
```

#### 6. Start the app

```bash
docker compose up -d
```

Verify it's running:

```bash
docker compose logs -f
```

The app is now available at `http://<LXC-IP>:3000`.

#### 7. Auto-start

Docker auto-starts on boot inside the LXC. Make sure the LXC itself starts on boot:

Select the container → **Options** → **Start at boot** → **Yes**

Or via CLI:

```bash
# On the Proxmox host
pct set 100 -onboot 1
```

#### 8. Update the app

```bash
cd ~/sound-party
git pull
docker compose up -d --build
```

#### Troubleshooting

- **Docker won't start?** Make sure nesting is enabled (step 2) and restart the container.
- **Network issues?** Check that the LXC bridge matches your VLAN setup. Run `ip a` inside the container to verify.
- **Permission denied errors?** If using an unprivileged container, nesting must be enabled. Alternatively, use a privileged container.

---

### Option B: Ubuntu Server VM

#### 1. Create the VM

Create an Ubuntu Server VM in Proxmox — either manually or via a community helper script. Minimal specs are enough:

| Resource | Recommended |
|----------|-------------|
| CPU      | 1 core      |
| RAM      | 512 MB–1 GB |
| Disk     | 8 GB        |
| Network  | VLAN bridge with access to Homey |

Make sure the VM's network/VLAN can reach your Homey Pro IP **and** that your iPad can reach the VM on port 3000.

#### 2. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Let your user run docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. Clone and configure

```bash
git clone <your-repo-url> ~/sound-party
cd ~/sound-party
cp .env.example .env
nano .env   # Fill in HOMEY_IP, HOMEY_TOKEN, VARIABLE_ID, FLOW_ID
```

#### 4. Start the app

```bash
docker compose up -d
```

Verify it's running:

```bash
docker compose logs -f
```

The app is now available at `http://<VM-IP>:3000`.

#### 5. Auto-start on boot

Docker's `restart: unless-stopped` policy (already in docker-compose.yml) ensures the container restarts automatically after a VM reboot. Just make sure Docker itself starts on boot:

```bash
sudo systemctl enable docker
```

#### 6. Update the app

```bash
cd ~/sound-party
git pull
docker compose up -d --build
```

## Customizing Sounds

Edit `public/sounds.json` to add, remove, or change sounds. Each item has:

```json
{ "label": "Ko", "emoji": "🐄", "command": "sound like a cow" }
```

- `label` — displayed text (Swedish)
- `emoji` — tile icon
- `command` — English text sent to Alexa

Add `"mystery": true` for a random-pick tile per category.
