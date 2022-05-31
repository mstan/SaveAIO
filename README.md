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
In the case of any Virtual console system, the emulated target system should be where the save file is constructed.

For example, for a Gameboy Advance game save that comes from a Wii U Virtual console, this game save should be ingested by SaveFileGameboyAdance, NOT SaveFileWiiU. 

SaveFileGameoyAdvance may store metadata ABOUT and export a save of the WiiU Virtual console container for purposes of reinjection of the file post-save modification.