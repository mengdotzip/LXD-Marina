## Snapshots

### Stateful
> [!NOTE]
> Stateful is used for vm's and not containers, using it on a container could give some errors for now.

In order to use stateful snapshots you will have to enable a couple of settings.
```
sudo snap set lxd criu.enable=true
sudo snap restart lxd
```

For now you will have to also run this on every instance, I'll try to automate this ASAP
```
lxc config set <instance_name> migration.stateful=true
```