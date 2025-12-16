This repo is deprecated in favor of https://github.com/mstan/node-saveaio


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

### NES
Wii U VC -> System 
System -> Wii U VC [UNTESTED]


## How to use this repository
1. Install NodeJS v16 or later on your computer. For details on this, go to: https://nodejs.org/en/download/  
2. Clone this Github repository  
3. `cd` into this repository once cloned (`cd SaveAIO`)  
4. Run `npm install`.  
5. Explore example scripts found in example/  

## Documentation
This package provides the following class interfaces:

### Classes

#### SaveFileGameboyAdvance(saveFilePath [,saveFileEnum]) 

##### exportWiiUVirtualConsoleSaveToMemory()
Exports a buffer of a Wii U virtual console save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.

##### exportWiiUVirtualConsoleSaveToDisk(filePath)
Writes an exported Wii U Virtual Console save to file at the specified file path.

##### exportGamesharkSPSaveToMemory()
Exports a buffer of a Gameshark SP save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.

##### exportGamesharkSPSaveToFile(filePath)
Writes an exported Gameshark SP save to file at the specified file path.



#### SaveFileNES(saveFilePath [,saveFileEnum]) 

##### exportWiiUVirtualConsoleSaveToMemory()
Exports a buffer of a Wii U virtual console save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.

##### exportWiiUVirtualConsoleSaveToDisk(filePath)
Writes an exported Wii U Virtual Console save to file at the specified file path.


#### SaveFileSuperNES(saveFilePath [,saveFileEnum]) 

##### exportWiiUVirtualConsoleSaveToMemory()
Exports a buffer of a Wii U virtual console save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.  

NOTE: As of 6/7/2020, exported save files do not import correctly. It is unclear as to why. Your save game will show up as a new save file. 


##### export3DSVirtualConsoleSaveToMemory()
Exports a buffer of a 3Ds virtual console save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.  

NOTE: As of 6/7/2020, exported save files do not import correctly. It is unclear as to why. Your save game will show up as a new save file.


##### exportWiiUVirtualConsoleSaveToFile(filePath)
Writes an exported Wii U Virtual Console save to file at the specified file path.
##### export3DSVirtualConsoleSaveToFile(filePath)
Writes an exported 3DS Virtual Console save to file at the specified file path.


#### SaveFileNintendo64(saveFilePath [,saveFileEnum]) 

#### exportVariantsToMemory()
Returns an in-memory object of four variants of the game save file. The returned object is an object containing four keys: `original`, `endianSwapped`, `wordSwapped`, `endianAndWordSwapped`. Each of the four are a variant of the same game buffer stored in memory with the respective actions taken on them based on their names.

#### exportVariantsToDisk(filePath)
Writes four exported Nintendo 64 saves to file. The buffer, unmodified, will be stored at the exact user specified path. Three variants, which will be in the same path and file name will exist, except the file names will be postpended with \_endianSwapped, \_endianAndWordSwapped, and \_wordSwapped. Each of the files are as their names suggest. If a user is trying to convert a file to something usable for their target system but does not know what needs done, it is useful to use this command to generate the mutations of the save file and to each one by one.

#### exportDexDriveSaveToMemory()
Exports a buffer of a Dex Drive virtual console save. This function will rebuild the save using the source save file stored, in case it has been modified or changed.

#### exportDexDriveSaveToFile(filePath)
Writes an exported Wii U Virtual Console save to file at the specified file path.

#### swapSaveFileEndian([bytes = 2])*
This function swaps the endianness of a save file. The user can specify the level of bytes they want endian swapped. If the user does not specify, the system will default to swapping endians at every 2 bytes (16 bits), which is the presumed default for all N64 endian swaps.  

swapSaveFileEndian() is a function available at the top level for all SaveFile classes, but it should be noted that by default the endian swapping is done at an 8 byte (64 bit) level, whereas Nintendo 64's swap function defaults to 2 bytes (16-bit)  

Example of a 2-byte endian swap is as follows on the following array:
```
[1,2,3,4] would become [2,1,4,3];
```

#### swapSaveFileWords([bytes = 2])
This function swaps the "words" of a save file. The user can specify the level of bytes they wanty word swapped. if the user does not specify, the system will default to swapping woards at every 2 bytes (16-bits), which is the presumed default for all N64 word swaps.

Example of a 2-byte word swap is as follows on the following array:
```
[1,2,3,4] would become [3,4,1,2]
```


### Class initialization arguments for all classes

##### `saveFilePath` (REQUIRED)
Relative path to the save file you've extracted.  
Example: `src\NES\Wii U Virtual Console\Legend of Zelda/WUP-FBAE.ves`  

##### saveFileEnum 
An optional argument that can be passed to determine the save file type. This is optional and SaveAIO will attempt to parse the save file type for you if left unspecified. The following save file enums are:  
`system` (all): Assumes save file comes from or is similar to that found on hardware. No special headers or parsing should be required.  
`action_replay` (SaveFileGameboyAdvance): An Action Replay extracted save file from a Gameboy Advance. 
`gameshark` (SaveFileGameboyAdvance): A Gameshark extracted save file from a Gameboy Advance. Found commonly on Gamefaqs. Not to be confused with "Gameshark SP".  
`gameshark_sp` (SaveFileGameboyAdvance): A Gameshark SP extracted save file from a Gameboy Advance. Found commonly on Gamefaqs. Not to be confused with "Gameshark".  
`wii_u_virtual_console` (SaveFileGameboyAdvance, SaveFileNES, SaveFileSuperNES): A Wii U virtual console save. Supports extraction and injection of NES, SNES, and Gameboy Advance titles.  
`3ds_virtual_console` (SaveFileSuperNES): A (New) 3DS virtual console save. Supports extraction and injection of Super NES save files. Super NES injection presently is broken, however.  
`3ds_or_wii_u_virtual_console` (SaveFileSuperNES): A (New) 3DS virtual console or Wii U save. Because the formats are effectively identical, this can be used in place of other wii_u_virtual_console or 3ds_virtual_console on SNES.  
`dex_drive`: A Dex Drive extracted Nintendo 64 save file. Found commonly on GameFaqs.    

### Shared Functions
The following functions are top level functions exposed to all SaveFile classes:  


#### init()
Reads the buffer from disk into memory  

#### exportToMemory()
Returns the BASE save file to memory that its reference can be stored in a variable. This is useful for grabbing a save file buffer and injecting it into other initialized save files.    

This will only ever export the _base_ game save file. For example, if you initialize a Gameshark SP or Wii U virtual console SaveFileGameboyAdvance instance and use this method, you will be returned the base game save file only, without its respective Gameshark SP or WIi U virtual console header (or footer, if applicable)  

#### exportToFile(filePath)
Writes the BASE save file in memory to file. This is useful for exporting an extracted save game file from a non-standard save and using it in an emulator/transferring it to a flash cartridge.  

This will only ever export the _base_ game save file. For example, if you initialize a Gameshark SP or Wii U virtual console SaveFileGameboyAdvance instance and use this method, you will have the base game save file written to disk, without its respective Gameshark SP or WIi U virtual console header (or footer, if applicable). This file, if exported correctly, shoudl be directly usable in place of an emulator or flash cartridge's save file.  

For writing the full game's container/header to disk (i.e. DexDrive or Wii U Virtual Console save), use the respective export method instead. For example: `exportWiiUVirtualConsoleSaveToFile(filePath)`  

#### setSaveFileSize([bytes])
Takes the BASE game save file in-memory and expands whitespace to to the make the save file match number of bytes by adding 0x00 at the end of the file. If the specified bytes expansion size is zero or less, no operation will occur.  

Example 1:  
I have a 32,768 kb gameboy advance save file and I need it to be 65,536 bytes for a specific system, I would issue the command "setSaveFileSize(65536)" to add an additional 32768 bytes to my save file.  

#### expandSaveFileWhitespace()
Expands the BASE game save file in-memory and expands whitespace to the next power of 2. If the save file is already at a power of 2, it will continue to the next power of 2  

Example 1:  
I have a 32,768 kb Gameboy Advance save file. By calling expandSaveFileWhitespace(), the save file will become 65,535 kb  

Example 2:   
I have a 30,000 kb Nintendo 64 save file. By calling expandSaveFileWhitespace(), the save file will become 32,768 kb  


#### trimSaveWhitespace()
Trims the BASE game save file in-memory of all trailing whitespace. It does this by enumerating through the end of the file in reverse, removing trailing 0x00 until it finds a value that is not 0x00 and will terminate.  

#### swapSaveFileEndian([bytes = 8])
This function swaps the endianness of a save file. The user can specify the level of bytes they want endian swapped. If the user does not specify, the system will default to swapping endians at every 8 bytes (64 bits).  

Example of a 8-byte endian swap is as follows on the following array:  
```
[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] would become [8,7,6,5,4,3,2,1,16,15,14,13,12,11,10,9];  
```


#### injectSave(saveBufferToInject)
Allows the user to swap out the existing initialized save with a brand new save file, without having to re-initialize the object. This is useful if the instance is that of a class where the save file was extracted from something like a virtual console save and the user wants to try and rebuild the virtual console save using different save data.  


## Design guide

### 1. All systems use the system's save file storage as authority.
In the case of where multiple standards exist for save file, the system's structure (decrypted) is considered the authority.  

### 2. In the case of "Virtual Console", the targeted emulated system is authority
In the case of any Virtual console system, the emulated target system should be where the save file class is constructed.  

For example, for a Gameboy Advance game save that comes from a Wii U Virtual console, this game save should be ingested by the "SaveFileGameboyAdvance" There is no "SaveFileWiiU" class as this project does not interpet native Wii U game files. This project only targets virtual console games that may be found on the Wii U, and their target classes should be used instead.  

The "SaveFileGameboyAdvance" class may store data ABOUT and contain the ability re-export a save back to a Virtual console system. For example, "SaveFileGameboyAdvance" can hold onto a Wii U Virtual Console GBA save container, and accept a native GBA save as an injection target, then export the full Wii U Virtual Console save .bin file.


## Credits

The following sources were used as references for implementations in this project:  
[save-file-converter](https://github.com/euan-forrester/save-file-converter/tree/main/frontend/src/save-formats) by [euan-forrester](https://github.com/euan-forrester)  
[SAVE2VC](https://github.com/GoobyCorp/SAVE2VC) by [GoobyCorp](https://github.com/GoobyCorp)   
[saveswap](https://github.com/ssokolow/) by [ssokolow](https://github.com/ssokolow)  
[mempak](https://github.com/bryc/mempak/wiki/DexDrive-.N64-format) by [bryc](https://github.com/bryc)  
[Research: SNES virtual console save files](https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/) by [k1r92](https://gbatemp.net/members/k1r92.385069/) and [mossywell](https://gbatemp.net/members/mossywell.270886/)    
Myself! [mstan](https://github.com/mstan). If you like what I do, patronage is appreciated over at my [Patreon](https://www.patreon.com/gamemaster1379?fan_landing=true)  



