# dataselfie-dev

## known bugs
- posts like friendship anniversaries and memories are not considered, which sometimes leads to time being added to the previously looked at post
- when Facebook tab has been in the background for a while and you go back the clock might not show up again
- more bugs commented in source code under "// FIX"

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

## to do list
- make tracking more stable (we need your help, please report any problems you run into)
- improve the Data Selfie dashboard front end code (handlebars or similar instead of jquery append - I know horrible)
