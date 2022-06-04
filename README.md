## Project status

### Gameboy Advance
Gameshark -> System  
Gameshark SP -> System
System -> Gameshark SP [UNTESTED]  
Wii U VC -> System  
System -> Wii U VC  

### Nintendo 64
Emulator (Project 64) <-> System 
Dex Drive -> System [UNTESTED]
System -> Dex Drive [UNTESTED]

### Super NES
3DS VC -> System
Wii U VC -> System [UNTESTED]
System -> 3DS [NOT WORKING]



## Design guide

### 1. All systems use the system's save file storage as authority.
In the case of where multiple standards exist for save file, the system's structure (decrypted) is considered the authority.

For example, for Nintendo 64, there are multiple save formats:
* Hardware/EverDrive
* Project 64
* Mupen 64
* Wii U Virtual Console

This software is expected to be able to ingest any of these, within reason, but the buffer should always be stored as the "Hardware" structure. 

Original 


### In the case of "Virtual Console", the emulated system is authority
In the case of any Virtual console system, the emulated target system should be where the save file class is constructed.

For example, for a Gameboy Advance game save that comes from a Wii U Virtual console, this game save should be ingested by SaveFileGameboyAdance, NOT SaveFileWiiU. 

SaveFileGameoyAdvance may store metadata ABOUT and export a save of the WiiU Virtual console container for purposes of reinjection of the file post-save modification.


## Credits

The following sources were used as references for implementations in this project:  
[save-file-converter](https://github.com/euan-forrester/save-file-converter/tree/main/frontend/src/save-formats) by [euan-forrester](https://github.com/euan-forrester)  
[SAVE2VC](https://github.com/GoobyCorp/SAVE2VC) by [GoobyCorp](https://github.com/GoobyCorp) 
[saveswap](https://github.com/ssokolow/) by [ssokolow](https://github.com/ssokolow)  
[mempak](https://github.com/bryc/mempak/wiki/DexDrive-.N64-format) by [bryc](https://github.com/bryc)
[Research: SNES virtual console save files](https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/) by [k1r92](https://gbatemp.net/members/k1r92.385069/) and [mossywell](https://gbatemp.net/members/mossywell.270886/)  




