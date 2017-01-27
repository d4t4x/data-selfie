# dataselfie-dev

## how to run

- to make a build (folder) from src ```npm run build```
- to maka a build and watch for changes ```npm run buildw```
- to make a build and minify etc (see webpack.config.js) ```npm run buildprod```
- in your Chrome browser go to chrome://extensions/ and tick the box that says "Developer mode"
- now click "Load unpacked extension..." and choose the build folder you just created
- you can now use Data Selfie, the extension icon (the eye) should now appear in your toolbar
- it is tracking if the eye is black (instead of gray) and if you can see a clock at the bottom left in your facebook window

## monitor your monitoring
- open console in any Facebook tab (by pressing Alt+Cmd+J on a Mac)
- you can see logs of what is happening in the background with Data Selfie

## fix for most errors
- "Have you tried turning it off and on again?" - refresh the Facebook tab or close and open a new one

## short cuts
- url bar, type "ds" + tab
- available commands ```reset db```, ```delete db```, ```init db```

## access local data

#### chrome local storage
- you can access settings, your general user data and the prediction
- open console in background page or Data Selfie Me page (Alt+Cmd+J on a Mac)
- copy ```chrome.storage.local.get(function(data){console.log(data)})```
- press Enter

#### tracked data
- open console in background page or Data Selfie Me page (Alt+Cmd+J on a Mac)
- go to the "Application" tab
- Storage > IndexedDB
- click triangle to expand the subitems
- "DataSelfieLocalDB" contains all tracked data (this is not saved anywhere else(!), so be careful before clearing this storage)

## known bugs
- posts like friendship anniversaries and memories are not considered, which sometimes leads to time being added to the previously looked at post
- when Facebook tab has been in the background for a while and you go back the clock might not show up again
- exporting your data can result in an invalid json file (that you can't import), when URLs contain double quotes " that are not excaped, you can do that manually by adding \ before the "
- more bugs commented in source code under "// FIX"

## to do list
- eventually the size of the content you have looked at will be too big for our APIs - an error returns
- make tracking more stable (we need your help, please report any problems you run into)
- improve the Data Selfie Me page front end code (responsive, handlebars or similar instead of jquery append - I know horrible)

## disclaimer

This project is maintained by one developer as of now. Get in touch to be involved at hello@dataselfie.it.

This was mainly tested in Chrome Version 55.0.2883.95 (64-bit) on a Macbook Pro with macOS Sierra 10.12.2 with Facebeook in English (US).