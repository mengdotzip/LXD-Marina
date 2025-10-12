# LXD-Marina
Web-based LXD instance management interface built with Go and JavaScript

https://github.com/user-attachments/assets/f877d3b7-4232-4e70-ab76-0666c745fd27

## Features

- Container Management - Create, start, stop, delete LXD containers from any image server

- Web Terminal - Browser-based console access using xterm.js with full terminal features

- API - All data to the lxd server will go through the lxd-marina api, the lxd server itself does not need to be network facing.

- SPICE Graphics - Graphical VM console via .vv file download and TCP proxy (port 5900)

- Real-time Events - Live operation tracking with timestamps and status updates

- Unified Dashboard - Single interface for both containers and VMs

- Simple Setup - Vanilla JavaScript frontend, no frameworks or compilation needed


## Setup

### lxd
Please make sure to have lxd installed and set up, you can easily do this by running:
```bash
sudo snap install lxd

getent group lxd | grep -qwF "$USER" || sudo usermod -aG lxd "$USER"
newgrp lxd

lxd init
```
Please make sure to check out the full documentation of lxd if you have questions about it:
https://documentation.ubuntu.com/lxd/latest/installing/ 

### LXD-Marina

> [!IMPORTANT]
> LXD-Marina requires go 1.22 or higher.

The setup of lxd-marina itself is fairly simple:
```
git clone https://github.com/mengdotzip/LXD-Marina.git
go build
./lxd-marina
```

## Todo

- Handle multiple spice connection (over multiple ports), now we just have 1 port to work with.
- Integrate an auth system (Mazarin does it for now).
- Make server setting so we can set default passwd or cluster in the future.

## Tips

For anybody wanting to read up or code new features, https://documentation.ubuntu.com/lxd/latest/howto/ is a great resource to read up on everything.
