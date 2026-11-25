import { REAL_WORLD } from '../edition';
import { REAL_LEAGUES } from './pyramid.real';

/**
 * A fictional ten-division pyramid (Premier Division = div 1 ... regional Division One = div 10).
 * Every club, stadium and league name is invented; the league structure (how many clubs, which
 * regional league feeds which) follows a typical English-style pyramid.
 * Each club line is "Name" or "Name|Stadium|Capacity" (one club per line in each `clubs` block).
 * `feeds` = key of the league this one promotes into (used to build the regional chain).
 */
export interface LeagueDef {
  key: string;
  div: number;
  name: string;
  short: string;
  lat: number;
  lon: number;
  feeds?: string;
  clubs: string;
}

export const FICTIONAL_LEAGUES: LeagueDef[] = [
  {
    key: 'PL', div: 1, name: 'Premier Division', short: 'Premier', lat: 52.5, lon: -1.5,
    clubs: `Northport United|Northport Stadium|53800
Kingsmouth City|Kingsmouth Park|46500
Redminster Athletic|Willow Ground|10350
Ashcombe Rovers|Ashcombe Lane|17750
Westbridge Albion|Westbridge Ground|32850
Havenford United|The Croft|23700
Blackmere Wanderers|Blackmere Road|44650
Castlebury City|Castlebury Lane|26000
Easthaven County|Market Field|48700
Fenmouth Town|The Common|29350
Saltbridge United|The Oval|38200
Greywater Rovers|Chapel Stadium|69150
Oakhaven City|Oakhaven Way|47850
Ironport United|Ironport Meadow|83600
Brackwater Town|Foundry Lane|47450
Coldmere Athletic|Coldmere Arena|32550
Stanmouth Rovers|Coronation Field|49350
Elmhaven Wanderers|Rectory Lane|67300
Larkford Albion|Larkford Road|57600
Dunholt County|Dunholt Meadow|32900`,
  },
  {
    key: 'CH', div: 2, name: 'First Division', short: 'First Div', lat: 52.5, lon: -1.5,
    clubs: `Eastmoor United|Eastmoor Recreation Ground|32400
Fairmouth Town|Victoria Lane|27600
Greyport City|Greyport Recreation Ground|30550
Westholt Rovers|Westholt Lane|23400
Ravenmoor Athletic|Coronation Lane|29400
Brightwater County|Coronation Ground|36900
Southcombe United|Southcombe Stadium|25500
Hollowmere Wanderers|Hollowmere Recreation Ground|30650
Stoneport Albion|Stoneport Recreation Ground|31500
Marshbury Town|Willow Road|36750
Cindermouth City|The Pavilion|21100
Northmere Rovers|Northmere Lane Ground|30400
Ashport United|Ashport Field|12650
Saltmere Athletic|Saltmere Ground|19200
Kingsholt Town|Kingsholt Lane|20600
Lowbridge County|The Green|17800
Thornhaven Albion|Thornhaven Recreation Ground|29750
Redcombe Wanderers|The Pavilion|36650
Wellmouth Rangers|Foundry Ground|33500
Copperbridge United|Copperbridge Park|31050
Gallowmoor Town|Castle Field|18850
Westmarsh City|Westmarsh Arena|25250
Ambermouth Athletic|Ambermouth Lane Ground|26550
Holmwater FC|Victoria Field|14300`,
  },
  {
    key: 'L1', div: 3, name: 'Second Division', short: 'Second Div', lat: 52.5, lon: -1.5,
    clubs: `Wrenbury United|Wrenbury Ground|10350
Winwich United|Winwich Park|25150
Fairstead Borough|Fairstead Way|18800
Branstead Town|The Pavilion|29050
Brinborough Albion|Market Road|23500
AFC Chelford|Chelford Way|7600
Dreyport Town|Dreyport Arena|34850
Mabley United|Mabley Stadium|15400
Henford United|Henford Ground|8950
Warcaster City|The Croft|26800
Shelborough United|Shelborough Way|8850
Aldstead FC|Priory Meadow|11050
Hagport United|Hagport Park Road|12050
Longbourne United|Longbourne Road|10400
Felborough United|Felborough Recreation Ground|6700
Granminster City|Granminster Road|14400
AFC Lamfield|Orchard Meadow|17050
Barkworth FC|Barkworth Park Road|15600
Hawkwich Town|Hawkwich Field|27150
Calport Athletic|Brewery Road|13050
Witfield County|Witfield Lane Ground|8650
Brookworth City|Brookworth Park Road|10450
Ulford Wanderers|The Rec|25800
Ockborough FC|Harbour Stadium|9650`,
  },
  {
    key: 'L2', div: 4, name: 'Third Division', short: 'Third Div', lat: 52.5, lon: -1.5,
    clubs: `Tadfield Rovers|Tadfield Park|5250
Halbridge FC|Halbridge Park Road|5600
Dreyminster United|Dreyminster Stadium|4500
Bickborough City|Railway Road|10350
Ulbury Town|Ulbury Way|6000
Sherton United|Sherton Way|7450
Galport Athletic|The Rec|6150
Longwich FC|The Paddocks|10950
Carrbridge County|Brewery Lane|9950
Skelchester FC|Foundry Field|5950
Granmouth City|Granmouth Lane Ground|9500
Calbury City|Calbury Arena|5500
Marworth Rangers|Church Meadow|11600
Stonemouth City|Chapel Ground|9300
Tetport FC|Elm Ground|4600
Chadbridge City|Chadbridge Recreation Ground|33800
Selborough FC|Selborough Arena|8450
Halcaster Town|Halcaster Arena|20250
Scarport Rovers|The Common|12750
Morchester United|Morchester Park Road|4450
Chelmouth Albion|Chelmouth Park Road|11000
Tetwich United|The Paddocks|15750
Ottbourne Town|Jubilee Stadium|14600
Quenworth Rovers|Coronation Lane|11650`,
  },
  {
    key: 'NL', div: 5, name: 'National Division', short: 'National', lat: 52.5, lon: -1.5,
    clubs: `Ashmore Town|Ashmore Ground|7300
Marlsey Sports|Marlsey Field|8150
Padchester Wanderers|Harbour Field|4250
Luning City|Chapel Road|4650
Barminster Town|Quarry Road|3300
Claylow United|Claylow Park|4000
Cawington FC|The Green|18300
Lamhaven Athletic|Lamhaven Way|5950
Chalholt Athletic|Chalholt Lane|10300
AFC Bercliffe|Quarry Lane|4850
Heathstow Rovers|Victoria Meadow|10350
Old Dordale Athletic|Victoria Ground|8750
Radham City|Radham Recreation Ground|6500
Carrwell Town|The Meadows|9000
Ravenlow Corinthians|Ravenlow Field|9200
North Henbourne Rovers|Henbourne Road|6150
Bickbury Rangers|Rectory Field|12300
Lindney Borough|Jubilee Lane|5050
Bexchurch Athletic|The Pavilion|4950
Mabmouth Town|Mabmouth Meadow|3100
West Ickley United|Chapel Stadium|4500
Chalhaven Town|Chalhaven Field|5300
Lamwell Town|Lamwell Recreation Ground|10900
Langmouth Albion|Church Field|9550`,
  },
  // ---------------- Step 2 (div 6)
  {
    key: 'NLN', div: 6, name: 'National North', short: 'Nat North', lat: 53.4, lon: -2.0,
    clubs: `Winmarsh United|Winmarsh Park Road|6100
Uxington Rangers|Mill Stadium|6750
Ivywell United|Ivywell Lane|4100
Fernholt United|Fernholt Way|2900
Carrmore United|Carrmore Road|5350
Haylow Athletic|Haylow Arena|5100
Wilcombe United|Wilcombe Park Road|4500
Cogcliffe Athletic|Cogcliffe Way|4050
Shelcaster Rovers|Abbey Road|2900
Hartwich Borough|Hartwich Recreation Ground|5200
Wenbourne Town|Wenbourne Recreation Ground|6950
Dorcaster United|Dorcaster Road|7650
Chadminster Town|Chapel Road|2800
Redby FC|Redby Arena|5550
Sherthorpe Rovers|The Hollow|2450
Pellby United|Victoria Ground|4200
Upper Burbury FC|The Green|3750
Great Ridstead Athletic|The Moor|2500
Oakminster Town|The Meadows|3750
Sandbury Athletic|Orchard Park|3400
Fairhurst Town|Fairhurst Way|3950
Radcott Rangers|Radcott Lane Ground|6300
Seldon Rovers|Station Field|4500
Kesmouth Town|Kesmouth Stadium|2250`,
  },
  {
    key: 'NLS', div: 6, name: 'National South', short: 'Nat South', lat: 51.3, lon: -0.8,
    clubs: `Wilcliffe United|The Croft|3350
Bramchurch Rovers|Bramchurch Arena|9450
Hollbourne Town|Hollbourne Meadow|3250
Larkmouth Town|Railway Lane|5450
Berworth United|Berworth Field|3400
Ilkstow United|Ilkstow Lane Ground|6200
Moorton Borough|Moorton Road|4200
Halbrook Rovers|Halbrook Meadow|6650
Dordale Celtic|Harbour Stadium|4600
Essworth FC|Rectory Meadow|5100
Wyby FC|Harbour Lane|2750
Tavby Town|Tavby Way|7100
Stanchurch City|Stanchurch Stadium|3200
Ashmarsh FC|Ashmarsh Park Road|3250
Ravenwick FC|Ravenwick Park|3200
Duning Town|Duning Field|3000
Ilkton FC|Ilkton Park|4200
Esscott United|Bridge Meadow|3800
Larkmarsh Harriers|Bridge Road|4500
Quenchurch Borough|The Rec|2150
Rushington United|Rushington Arena|3100
Selwich Rovers|Wharf Road|7250
Mabdon Town|Mabdon Stadium|3050
Morwick United|Morwick Lane|3550`,
  },
  // ---------------- Step 3 (div 7)
  {
    key: 'NPLP', div: 7, name: 'North Premier', short: 'North Premier', lat: 53.6, lon: -1.9, feeds: 'NLN',
    clubs: `Haldon United|Haldon Park Road|4350
Dunwick Athletic|Dunwick Park Road|2750
Goldhurst Wanderers|Quarry Stadium|850
Hagcott Town|The Moor|4600
West Stonebridge FC|Abbey Road|4100
Quenborough United|Quenborough Way|3450
East Falfield FC|Common Ground|1650
Barkcott Town|Barkcott Park|6150
Wexhaven Rovers|The Green|4500
Ilkdon Town|Ilkdon Way|2750
Hunwell Town|The Green|3450
Sandton Rovers|Sandton Park Road|3600
Shipcott FC|Shipcott Stadium|1600
Longsey United|Longsey Ground|1950
Pellmore City|The Common|1300
AFC Claystead|The Paddocks|3850
Longington FC|The Moor|1900
Ravenmore Albion|Wharf Lane|1250
Bilport Town|Wharf Meadow|2500
Rookholt City|Chapel Field|3550
Merefield Athletic|Wharf Stadium|2700`,
  },
  {
    key: 'SLPC', div: 7, name: 'Central Premier', short: 'Central Premier', lat: 52.4, lon: -1.2, feeds: 'NLN',
    clubs: `Everport Wanderers|The Oval|2200
Rooklow United|Rooklow Lane|3000
Kirkborough United|The Oval|2900
AFC Coldby|Harbour Stadium|2500
Kirkport United|Chapel Field|4100
Burford Town|Burford Field|3550
Wilwell Albion|Wilwell Arena|3250
Burstead Town|Burstead Lane|3450
Merelow Borough|Elm Stadium|1100
Quendale United|Abbey Ground|3200
Ockwell United|Ockwell Meadow|2300
Ulham Rovers|The Common|4250
Marfield Corinthians|Marfield Road|1650
Upper Woodcombe United|Chapel Stadium|1500
Skelstow Town|Willow Stadium|5450
Kirkmouth Albion|Kirkmouth Road|5400
Claysey Wanderers|Heath Stadium|2350
Crowport Harriers|Abbey Ground|1850
Cogmere United|Cogmere Park Road|1950
Witchester Town|Priory Meadow|2300
Scarcombe United|Scarcombe Recreation Ground|2250
Burbury Wanderers|Jubilee Ground|10550`,
  },
  {
    key: 'SLPS', div: 7, name: 'South West Premier', short: 'SW Premier', lat: 51.0, lon: -2.2, feeds: 'NLS',
    clubs: `AFC Skelhurst|Skelhurst Way|1850
Harden Corinthians|Harden Lane|1950
Saltby Town|Saltby Lane Ground|1750
Kesdon Wanderers|Quarry Stadium|2500
AFC Wenborough|Wenborough Park Road|5050
Walbridge Albion|Station Park|2950
Hesborough Harriers|Hesborough Park Road|1650
South Fairchester Athletic|Fairchester Meadow|4150
Rosley Athletic|Jubilee Park|3900
Melstead Harriers|Jubilee Park|2950
Brinwick Town|Brinwick Meadow|5000
Whitbridge Sports|The Common|2800
Bilby Albion|Bilby Recreation Ground|3300
Pencombe United|The Moor|2750
Saxley Rovers|Saxley Way|2400
Bickford United|The Rec|2800
Coring Town|Rectory Field|3800
Norcott Sports|Common Meadow|3400
Sherdale United|Sherdale Field|2250
Millwell Town|Millwell Park|6350
Cawton Rovers|Willow Lane|3200
Shipington Town|Shipington Road|2000`,
  },
  {
    key: 'ISTP', div: 7, name: 'South East Premier', short: 'SE Premier', lat: 51.4, lon: 0.3, feeds: 'NLS',
    clubs: `Woldbourne Town|Elm Road|3450
Little Branlow United|Branlow Meadow|4700
Harchurch City|Priory Road|1550
Stonehurst Sports|Rectory Ground|2500
Wrenmore Borough|Orchard Stadium|4450
Dendon City|Dendon Lane Ground|4850
Wrencaster Borough|Wrencaster Lane|4800
Harcliffe City|Coronation Park|3200
Fernhaven FC|Fernhaven Way|2000
Bramhaven Athletic|Market Park|1400
Barkham Harriers|Barkham Lane|2500
Marlcliffe City|Railway Road|4000
AFC Walcliffe|Walcliffe Lane|3200
Lamgate Town|Abbey Lane|3500
Great Tadport Athletic|Market Meadow|3850
AFC Drayden|The Green|3250
Dreybridge Town|Dreybridge Stadium|1950
Lower Normere Rangers|Priory Park|3850
Radbridge FC|The Rec|5650
Nutford Borough|Nutford Stadium|3550
Witborough Town|Harbour Stadium|3300
Morcliffe Albion|Rectory Road|2800`,
  },
  // ---------------- Step 4 (div 8)
  {
    key: 'NPLE', div: 8, name: 'North East League', short: 'North East', lat: 54.0, lon: -1.3, feeds: 'NPLP',
    clubs: `Oakton United|Oakton Road|1850
Esswell Town|Esswell Field|1700
Elmcombe Town|Elmcombe Field|4650
Longcliffe Town|Longcliffe Stadium|1000
Wenby Sports|Priory Ground|3050
Woodstead United|The Green|3400
Tamhurst Athletic|Tamhurst Field|950
West Tetworth Borough|Foundry Field|4200
Oakbourne Town|Oakbourne Meadow|2350
AFC Whitney|Abbey Meadow|2200
Berchester Town|Wharf Ground|3100
Lunstow Borough|Priory Meadow|1350
Belborough Borough|Belborough Park Road|1650
Cawbridge FC|The Hollow|1750
AFC Bexport|Bexport Road|2850
Selham Albion|Coronation Field|2350
Felbury United|Felbury Park|950
Edenstead FC|Edenstead Road|3150
Tamham Borough|Tamham Field|3650
Brooklow Sports|The Hollow|1250
Wrenbrook United|Wrenbrook Park Road|1150
Coldbridge Swifts|Victoria Field|1650`,
  },
  {
    key: 'NPLW', div: 8, name: 'North West League', short: 'North West', lat: 53.6, lon: -2.7, feeds: 'NPLP',
    clubs: `Kescombe Athletic|Kescombe Ground|2400
Kelcott Town|Memorial Field|1300
Great Bilmarsh Corinthians|Mill Road|2300
Felbourne Athletic|Elm Meadow|11450
Rushgate FC|Rushgate Meadow|3200
Bramington FC|Bramington Stadium|2150
Blackdon Harriers|Heath Park|1700
Tavport Town|Tavport Lane|1000
Hartholt FC|The Green|1850
Kelford Town|The Common|950
Ivywick Athletic|Abbey Field|3700
Upper Walchester Town|Walchester Stadium|3750
Stanstow Corinthians|The Meadows|4350
Oakwell Rangers|Oakwell Park Road|1750
Felington Corinthians|The Rec|1300
Ludmouth Town|The Moor|4900
AFC Greystow|Market Field|3900
Carrney City|Rectory Road|5900
Lungate Town|Abbey Ground|2200
Norden Town|Norden Park Road|3200
Hawkham FC|Hawkham Meadow|4750
Shergate Sports|Castle Field|1400`,
  },
  {
    key: 'NPLM', div: 8, name: 'Midlands League', short: 'Midlands', lat: 52.8, lon: -1.3, feeds: 'SLPC',
    clubs: `Kingsmarsh Borough|The Croft|3050
Market Morthorpe Rovers|Morthorpe Meadow|1000
Saxthorpe Sports|Saxthorpe Ground|1600
AFC Dalsbourne|The Pavilion|3200
Dalswick Town|The Moor|2350
Lower Buring United|Buring Park Road|2250
AFC Upper Hagney|Foundry Lane|2050
Berwick Athletic|Willow Meadow|1850
Bilcott FC|Bilcott Park|2000
Stavney Rovers|Willow Lane|3700
Larkley Celtic|Larkley Park Road|1100
Uxby Sports|The Common|1300
Old Brockhaven Victoria|Common Ground|1350
Ormbury Rovers|The Green|3350
Keswich Athletic|Keswich Park Road|1400
Greymarsh FC|Memorial Park|1950
Esswick Rovers|Esswick Recreation Ground|1050
Nutden FC|Nutden Road|5650
Brackdale Rangers|Brackdale Lane Ground|2850
Glenford Sports|Glenford Meadow|3650
Greyminster Borough|Greyminster Meadow|1950
Haring Rangers|Common Road|4450`,
  },
  {
    key: 'SL1C', div: 8, name: 'Central League', short: 'Central', lat: 52.0, lon: -0.7, feeds: 'SLPC',
    clubs: `Tamwick Victoria|Orchard Ground|3100
Stavcaster Harriers|Wharf Lane|4850
North Redfield Borough|Heath Lane|3700
Woldwich Rangers|Woldwich Park|3100
AFC Coldwick|Coldwick Meadow|2650
Bramby United|Bramby Stadium|2950
Wrenley Borough|Wrenley Field|5050
Quenmere City|Quenmere Meadow|1950
Carrbourne Wanderers|Foundry Meadow|2150
Yarwich Borough|Yarwich Field|6100
Kirkbridge Wanderers|Kirkbridge Arena|3550
Rookmore FC|Memorial Meadow|2950
Hagton Town|Hagton Meadow|1600
Ridmere FC|Elm Meadow|1550
Everley FC|Everley Recreation Ground|3400
Redworth Town|Redworth Way|1550
AFC Stonehaven|Station Stadium|3350
Rookmouth FC|Harbour Road|1000
Quarwood United|Quarwood Lane Ground|1550
Keshaven United|Wharf Lane|2750
Raventon Rangers|Raventon Road|3150
Hedbourne City|Foundry Ground|3200`,
  },
  {
    key: 'SL1S', div: 8, name: 'South West League', short: 'South West', lat: 51.2, lon: -2.4, feeds: 'SLPS',
    clubs: `Dreyham City|Dreyham Road|4850
Gilchurch City|Priory Meadow|6550
Saltgate United|Saltgate Meadow|1400
Hollford Athletic|Railway Road|1650
Saxstow Corinthians|Saxstow Recreation Ground|1950
Chermere Town|Chermere Meadow|3400
Bilmouth Athletic|Bilmouth Meadow|1350
Gilfield Town|Wharf Road|3250
Galwick United|Galwick Field|2650
Marmouth United|Rectory Stadium|1850
Haywich Town|Wharf Ground|1400
Wychester Rangers|Wychester Road|2700
Hesfield Borough|Hesfield Stadium|2250
Calstead Athletic|Market Field|1550
Heathney Athletic|Heathney Stadium|2450
Sherborough Town|Sherborough Way|500
AFC Scarmouth|Orchard Park|2100
Brackchurch Wanderers|Chapel Ground|1900
Nutstow Borough|The Oval|2650
Kelwich Sports|Abbey Field|1100
Mabmore Harriers|Mabmore Lane Ground|4700
Wexwich Wanderers|Foundry Meadow|3900`,
  },
  {
    key: 'ISTN', div: 8, name: 'East League', short: 'East', lat: 51.8, lon: 0.6, feeds: 'ISTP',
    clubs: `Ramsney City|Ramsney Arena|3650
Woodcliffe Borough|The Oval|1350
Midchurch United|The Oval|1850
Brockminster FC|Brockminster Arena|3250
Ottwick FC|The Croft|2900
Galmouth Town|The Hollow|900
Goldholt Town|Abbey Lane|2100
Hartby City|Station Park|4000
Sandport Town|The Oval|4200
Radstead Athletic|Radstead Way|3200
Berbury Athletic|Jubilee Meadow|3150
Branbridge FC|Branbridge Arena|2950
Dalsney Borough|Dalsney Stadium|2200
Brockington Town|Rectory Stadium|2700
Everwell United|Everwell Way|2700
Wilbridge Athletic|Wilbridge Recreation Ground|1400
Burdale United|Burdale Park|2150
Rushwick FC|Market Meadow|4100
Dreybrook Town|Dreybrook Park Road|550
Chadfield United|Chadfield Recreation Ground|3650
Yarton Wanderers|Yarton Lane Ground|2550
Great Yaring Town|Brewery Stadium|2750`,
  },
  {
    key: 'ISTSC', div: 8, name: 'South Central League', short: 'South Central', lat: 51.4, lon: -0.4, feeds: 'ISTP',
    clubs: `Norport United|Common Park|1350
Ulsey United|The Oval|1200
Great Cawmore Town|Cawmore Field|2900
AFC Lindbourne|The Rec|1000
AFC Elmwood|The Paddocks|4650
Hawkmere FC|Hawkmere Arena|5050
Denden Borough|Denden Park Road|5000
Great Carrmarsh United|Carrmarsh Arena|850
AFC Foxdale|Elm Park|3500
Draywell Athletic|The Common|2000
Wadchester City|The Croft|3000
Fenworth Rovers|Orchard Road|2000
East Wadbrook Athletic|Wadbrook Stadium|1850
Heathbourne Town|Heathbourne Park Road|3650
Wymarsh Rovers|Wymarsh Meadow|2150
Moorwich Town|Moorwich Lane|4550
Market Dungate Athletic|Dungate Meadow|2750
Warworth United|Warworth Arena|1050
Hawkwick Athletic|Jubilee Field|1950
Chelchurch United|Chelchurch Lane|1750
Whitmore Town|Priory Park|3200
Burchurch United|Burchurch Arena|1700`,
  },
  {
    key: 'ISTSE', div: 8, name: 'South East League', short: 'South East', lat: 51.1, lon: 0.4, feeds: 'ISTP',
    clubs: `Fenstow Town|Fenstow Field|3100
Yardale Town|Yardale Stadium|1750
Cogwood Wanderers|Harbour Field|3450
Fernden FC|Fernden Arena|3800
Market Ormby Borough|The Oval|1850
Stoneholt Rangers|Stoneholt Lane|2150
Saxmarsh Borough|Jubilee Ground|1700
Ashthorpe Celtic|Quarry Field|3100
Edenley Town|Brewery Park|2650
Fairsey FC|The Pavilion|1100
Gilham United|Gilham Lane|1750
Ramsmouth Town|Church Park|1100
Uxlow Corinthians|Uxlow Park Road|4000
Upper Brackhurst City|Brackhurst Field|3250
Wilstead City|Wilstead Park Road|2050
Dreycombe Town|Dreycombe Lane Ground|2100
Nutbourne Albion|Nutbourne Ground|2750
Great Hesholt Town|Hesholt Road|1600
South Edenfield Borough|Coronation Meadow|1750
AFC Tamley|Railway Ground|2150
Greyhaven United|Greyhaven Meadow|1400
Halwick United|Bridge Ground|1100`,
  },
  // ---------------- Step 5 (div 9) - the player starts here
  {
    key: 'NL1', div: 9, name: 'Tyne & Tees League Premier', short: 'Tyne & Tees Premier', lat: 54.7, lon: -1.6, feeds: 'NPLE',
    clubs: `Kingsport Town|Kingsport Road
Wadwell Athletic|The Common|2000
Hagford United|Kingfisher Park|3950
AFC Shelgate|Wharf Meadow|2100
Wexwell Town|Wexwell Meadow|2200
Pikebury United|Pikebury Park|2250
Midholt Harriers|Midholt Lane
Bardon Rovers|Bardon Stadium|1600
Heshurst FC|Memorial Lane
Kingsby Swifts|Abbey Road
Ridminster Borough|Ridminster Way
Tamcott Albion|The Croft|1450
Little Wrenwell Victoria|Wrenwell Recreation Ground|1950
Cherton Town|Cherton Road|4450
Uxden Rangers|Uxden Ground
Pikemouth Town|The Croft|2600
Bexfield United|Harbour Meadow|1400
Quenbury Sports|Foundry Park|3600
Padmere United|Padmere Stadium`,
  },
  {
    key: 'NCEP', div: 9, name: 'Ridings League Premier', short: 'Ridings Premier', lat: 53.6, lon: -1.2, feeds: 'NPLE',
    clubs: `Skelbridge Borough|Chapel Field|550
Haybury United|Haybury Park Road|2950
Ivycaster Town|Memorial Stadium|1650
Stonegate Town|Heath Lane|1000
Edenborough Town|Jubilee Park|1100
Redley Wanderers|Redley Way|2150
Thornbrook Town|Wharf Stadium|2000
Norwell Corinthians|Norwell Field|1250
Marmore Athletic|Marmore Stadium|2700
Barkgate Corinthians|Barkgate Park Road|800
Melford Town|Bridge Field|1150
Galchester United|Kingfisher Ground|2000
Stavford Town|Stavford Stadium|900
Barkcliffe United|Barkcliffe Lane Ground|1050
Kelby Rangers|Kelby Way|2150
Whithaven Victoria|Whithaven Road|2000
Everbury Colliery|Everbury Field|2150
Rookchester Town|Rookchester Park Road|2050
Denholt Town|Denholt Way|2950
Ottwood Sports|The Hollow|550`,
  },
  {
    key: 'NWCP', div: 9, name: 'Mersey Valley League Premier', short: 'Mersey Valley Premier', lat: 53.5, lon: -2.6, feeds: 'NPLW',
    clubs: `Kirkcliffe Rangers|Kirkcliffe Lane
Brinton Athletic|Chapel Stadium
Ludcott Town|Ludcott Park
AFC Witwood|Jubilee Lane
Ravenstow Borough|Ravenstow Lane Ground
Chalford Albion|Chalford Park Road
Loxworth Athletic|Loxworth Meadow
Wexminster Colliery|Orchard Stadium
West Sherley FC|Willow Field
Gilcliffe Rovers|The Green
Stoneborough Rovers|Stoneborough Field
Wygate Town|Wygate Meadow
Ridbrook Corinthians|Ridbrook Park
Winford Athletic|Willow Ground
Chalsey Wanderers|Castle Lane
Skelworth Corinthians|Victoria Park
Edenlow FC|Edenlow Field
Lunbury Rovers|Heath Ground
Merechurch FC|Castle Road
AFC Padford|Padford Lane
Dalsden Harriers|Church Meadow
AFC Kingscott|The Hollow
Marlcott Town|Foundry Lane
Nutlow Sports|Nutlow Stadium`,
  },
  {
    key: 'MLP', div: 9, name: 'Heartland League Premier', short: 'Heartland Premier', lat: 52.5, lon: -1.9, feeds: 'NPLM',
    clubs: `Belwich FC|Belwich Park|2600
Brockford Celtic|Brockford Lane Ground
Tamford Albion|Tamford Meadow|1700
Stavbury Harriers|The Croft|1600
Riding United|Riding Recreation Ground
Brinbridge Town|Harbour Stadium
Berstow United|Berstow Road|1300
Radchester Town|Priory Lane|2300
Wystead Harriers|Wystead Lane|1000
Wexborough Town|Wexborough Meadow
Great Ulbridge Sports|Ulbridge Park Road|2000
AFC Witchurch|Witchurch Park
Blackington Rovers|Blackington Recreation Ground|1950
Elmden Rovers|The Pavilion
Barbrook United|Station Ground|1800
AFC Verney|Verney Way
Henworth Sports|The Rec
AFC Harford|Harford Field|2600`,
  },
  {
    key: 'UCPN', div: 9, name: 'Shires League Premier North', short: 'Shires Premier North', lat: 52.9, lon: -0.8, feeds: 'NPLM',
    clubs: `Shelwick Athletic|Heath Stadium
Warham Rovers|Warham Park
Uxham FC|Elm Park
AFC Hedholt|Market Road|850
Evermarsh Wanderers|The Oval|5550
South Quenchurch United|Quenchurch Lane Ground
Henby Athletic|Rectory Stadium|2050
Crowholt United|Crowholt Road
Ottworth Wanderers|Ottworth Stadium|8050
Lindmore Harriers|Lindmore Arena|2350
Ickminster Town|Brewery Stadium
Brookbourne Town|The Moor|2700
Claythorpe Celtic|Market Lane|3950
Hambrook Corinthians|Common Field
Yarwick Rangers|Memorial Lane
AFC Ulden|Harbour Road
Penbrook United|Church Field
Sherminster Dynamos|The Croft|1100
Wexdale FC|Wexdale Way
Lower Thornwick Town|The Rec|1100`,
  },
  {
    key: 'UCPS', div: 9, name: 'Shires League Premier South', short: 'Shires Premier South', lat: 52.3, lon: -0.6, feeds: 'SL1C',
    clubs: `Verwell Town|Verwell Stadium
Upper Rushfield Sports|Elm Park|1150
Goldstead Sports|Willow Field|2700
AFC Pikebridge|Priory Park|3650
AFC Gildale|Priory Stadium|1650
Hedborough Athletic|Station Road
Penbridge Swifts|Railway Meadow
Verton FC|The Common|2800
Ivysey Town|Market Field
Falfield FC|Church Meadow|2450
Tadholt Athletic|Memorial Park|4100
Verport FC|Verport Park
Tamcaster FC|The Hollow
West Wexbrook Rovers|Wexbrook Ground
Nutworth Colliery|The Croft
Brookdon FC|Brookdon Field|1950
Foxwood Colliery|Coronation Meadow
Great Hagby Borough|Priory Lane
Market Tetbrook FC|Tetbrook Arena|4650
Gilney United|Common Ground|1150`,
  },
  {
    key: 'ECP', div: 9, name: 'Fenland League Premier', short: 'Fenland Premier', lat: 52.4, lon: 1.0, feeds: 'ISTN',
    clubs: `Skelmere Rangers|Skelmere Lane Ground
Lower Branport FC|The Paddocks|3350
Wrenstead Corinthians|Wrenstead Arena|1600
Witdon Rovers|Witdon Road|2100
Goldcaster Town|Memorial Meadow|3800
Belhaven United|Willow Stadium|2700
Ashney United|The Meadows
Ramswich Town|Abbey Ground|2900
Shipden Borough|The Croft
West Glenchester Wanderers|Glenchester Arena|500
Cogmore Town|Foundry Road|1750
Bramstow Celtic|Bramstow Road
Marlby FC|Marlby Park Road
AFC Luncott|Luncott Ground|2200
Sandfield United|Harbour Field|1000
Stavgate FC|Station Field|1600
Hartstead Town|Hartstead Arena|1000
Nutport Wanderers|Church Meadow|3050`,
  },
  {
    key: 'ESL', div: 9, name: 'Estuary League Premier', short: 'Estuary Premier', lat: 51.6, lon: 0.4, feeds: 'ISTN',
    clubs: `Wexwick FC|The Oval|750
Hagthorpe United|The Common|2200
Fernbrook Athletic|Fernbrook Park|2950
Blackcombe Rovers|Blackcombe Ground|3900
AFC Scarworth|Scarworth Recreation Ground|1300
Falcombe Town|Falcombe Ground|550
Goldbrook Town|Willow Meadow|2650
Norfield Corinthians|Orchard Field|2400
Whitstead United|The Croft|3400
Upper Bermere United|Mill Road|2700
Penington Olympic|Penington Field|1550
Ludmore Borough|Victoria Park|3350
Rookney FC|Rookney Meadow|900
Dunwell FC|Victoria Park|2250
Thornmere FC|Thornmere Lane Ground|3300
Pikefield Sports|Coronation Ground|3100
Saxford FC|Elm Meadow|2750
Harbourne Athletic|Orchard Lane|3050
Greybury Albion|The Pavilion|2550
Dunmouth FC|Kingfisher Lane|3400`,
  },
  {
    key: 'SSMP', div: 9, name: 'Chiltern League Premier', short: 'Chiltern Premier', lat: 51.8, lon: -0.5, feeds: 'SL1C',
    clubs: `Uxminster Borough|Willow Field|3100
Hunwood FC|Jubilee Ground|3300
Penstow Wanderers|Harbour Meadow
Skelchurch United|Skelchurch Stadium
Essington Rovers|Memorial Park|2100
Ulcliffe Sports|Ulcliffe Way|1050
North Hollden Town|Hollden Way
Stanminster Corinthians|Chapel Road|4050
Bickmore Town|Bickmore Park|2950
Ickby Town|The Green|2700
Tamsey Olympic|Harbour Meadow|3500
AFC Marwick|Castle Road
Shelfield Town|Castle Road|2050
Blackborough Olympic|Priory Lane|2000
Brackhurst Town|Castle Road
Belney United|Belney Stadium|1400
Lunford Town|Mill Road|2250
Moorwell Town|Moorwell Park
Dalswich Town|Bridge Park|2150
Little Walney Borough|Walney Stadium|500`,
  },
  {
    key: 'HLP', div: 9, name: 'Cotswold League Premier', short: 'Cotswold Premier', lat: 51.8, lon: -1.6, feeds: 'SL1S',
    clubs: `Market Shipstow Colliery|Shipstow Lane|3100
Rookington Town|Common Park|4650
Roscaster FC|Orchard Stadium|1100
Chalcaster Sports|Chalcaster Park Road|1250
Tadstead Harriers|The Common|2000
AFC Whitbourne|Whitbourne Way|1750
South Brinden FC|The Croft|1950
Barkmore Rovers|Barkmore Meadow|2300
Brambridge Colliery|The Meadows|2150
Salting United|Salting Stadium|450
Radcaster Wanderers|Bridge Park|650
Fairgate Town|Fairgate Field|2450
Chilcliffe Albion|Chilcliffe Park Road|4500
Wrenhurst Town|Wrenhurst Arena|1800
Ramsport Town|Ramsport Ground|1950
Chilmore Sports|The Common|1450
AFC Gilbridge|Foundry Lane|1050
Quarham Corinthians|Quarham Arena|1050
Cawstead Harriers|Cawstead Lane Ground|1950
Cogden Town|Cogden Arena|1000`,
  },
  {
    key: 'CCPN', div: 9, name: 'Downs League Premier North', short: 'Downs Premier North', lat: 51.5, lon: -0.5, feeds: 'ISTSC',
    clubs: `Felstead Town|Felstead Park|1700
Tavden Town|Station Stadium|1450
Corcombe Athletic|Corcombe Road|950
Falport Town|Falport Park Road|2500
Ludthorpe Town|Ludthorpe Ground|2250
Brackstead Corinthians|Brackstead Meadow|1100
Woodchester Town|Abbey Stadium|2250
Dencliffe Sports|Dencliffe Recreation Ground|2050
Shipborough Swifts|Shipborough Field|1200
Moormere United|Victoria Stadium|2100
Haymore Town|Quarry Field|900
Saxwick Town|Saxwick Lane Ground|1400
Yarwell Town|Coronation Stadium|1000
Midbourne FC|Midbourne Arena|1850
Ockbrook FC|Foundry Road|1900
South Ramsmarsh FC|Ramsmarsh Way|1800
Tavdon Dynamos|Coronation Stadium|2100
Warbrook Athletic|The Paddocks|1300
Millmore FC|Millmore Way|4600
Ivyfield Town|Ivyfield Recreation Ground|850`,
  },
  {
    key: 'CCPS', div: 9, name: 'Downs League Premier South', short: 'Downs Premier South', lat: 51.2, lon: -0.4, feeds: 'ISTSC',
    clubs: `Quenbridge FC|Rectory Road|1100
Marcaster Wanderers|The Pavilion|2150
Scarwell United|Bridge Stadium|1300
Uxbourne Rovers|The Green|3450
Tadborough United|Rectory Meadow|2250
Calstow Town|Calstow Meadow|2200
Wyholt Town|Wyholt Park Road|1800
Crowcaster Town|The Pavilion|2900
Felstow Corinthians|The Oval|1950
Shipminster Town|The Meadows|950
Ulport Sports|Elm Park|2150
Stonecliffe Rovers|Foundry Stadium|1400
Kelborough Town|Abbey Meadow|1900
AFC Upper Saxcombe|Saxcombe Road|900
Chilmere Sports|Chilmere Recreation Ground|2250
Ridhurst United|Railway Park|550
Selbrook Corinthians|Heath Road|5250
Heslow Harriers|Church Ground|1050
Goldcliffe Town|Goldcliffe Lane|1650
Hartmore Athletic|Hartmore Stadium|3600`,
  },
  {
    key: 'SCFP', div: 9, name: 'South Coast League Premier', short: 'South Coast Premier', lat: 50.9, lon: -0.3, feeds: 'ISTSE',
    clubs: `Wyley Athletic|Wyley Road|7700
Dalshurst FC|Heath Stadium|1100
Keston Dynamos|The Green|850
Wading Town|Abbey Meadow|1250
Kirkmere United|Station Park|1400
Marlford FC|Marlford Field|5500
Cherborough Rangers|Cherborough Road|2100
Hesdon FC|Hesdon Park Road|1700
Scarney FC|Scarney Way|1500
Caling Town|Caling Lane|2100
Greycott Athletic|Greycott Ground|1050
Bexcott Town|The Croft|950
AFC Melholt|Melholt Meadow|2850
South Belwell Swifts|Market Lane|1350
Quenmouth FC|Quenmouth Lane|2650
Coldmore Athletic|Coldmore Lane Ground|1000
Ockfield United|Ockfield Lane
Hawkden Town|Hawkden Stadium|2150
Kingscliffe Dynamos|Kingscliffe Lane|1950
Hayborough Town|Harbour Field|2250`,
  },
  {
    key: 'SCEP', div: 9, name: 'Weald League Premier', short: 'Weald Premier', lat: 51.3, lon: 0.6, feeds: 'ISTSE',
    clubs: `Fairwell Town|The Oval|1050
Everney FC|Elm Road|1250
Shelmere Sports|Castle Field|2200
Pikedale Athletic|Pikedale Recreation Ground|4050
AFC Harton|Harton Arena|2900
Walsey Town|Walsey Road|2450
AFC Burthorpe|Burthorpe Field|1100
Shelby FC|Shelby Stadium
Cawfield Dynamos|Willow Lane|3100
Ulbrook Athletic|The Rec|2800
Barkwood Town|Kingfisher Ground|2850
Brookcombe United|The Hollow|2050
Tavsey Town|Tavsey Recreation Ground|600
Heathstead Town|Heathstead Recreation Ground|1500
Chelney Town|Market Road|1050
Radwich Town|Victoria Road|1450
Blackney FC|Church Ground
Gilchester United|Victoria Park|3350
Branport Rovers|Priory Stadium|2850`,
  },
  {
    key: 'WXP', div: 9, name: 'Solent League Premier', short: 'Solent Premier', lat: 50.9, lon: -1.5, feeds: 'SL1S',
    clubs: `Elmby FC|Elmby Way|1000
Fenhurst United|Castle Park|1100
Loxport FC|Willow Ground
Lower Shipmore United|Shipmore Park|2000
Hundale United|Wharf Meadow|2600
Hartborough Corinthians|Hartborough Meadow|2150
Mabden Town|Mabden Lane Ground|2200
Lindbridge Town|Lindbridge Lane|1800
Ramsley FC|Rectory Meadow|2000
Falford FC|Common Park|1100
Chilmouth Borough|Chilmouth Lane
Goldcott United|Coronation Park|1700
Bexborough Borough|The Hollow|850
Walport Rovers|The Hollow
Stanford Borough|Stanford Arena|1050
Aldmouth Corinthians|Harbour Park|3250
AFC Edenham|Edenham Meadow|3050
Tetmere Town|Tetmere Road|2150
Morchurch United|Morchurch Lane|1100
Brockley Wanderers|Brockley Park|950`,
  },
  {
    key: 'WEP', div: 9, name: 'Severn League Premier', short: 'Severn Premier', lat: 51.2, lon: -2.9, feeds: 'SL1S',
    clubs: `Blackworth Athletic|Coronation Road|4600
Warbourne Town|Brewery Meadow|1050
Selbridge FC|Selbridge Stadium|2650
Rosthorpe United|Market Meadow|3200
Fenthorpe Town|Coronation Stadium|1000
North Galcott Wanderers|Galcott Ground|4250
Woldley FC|Heath Stadium|1350
Fernham Corinthians|Kingfisher Stadium|1950
Harwell Town|Kingfisher Lane|4800
Chilminster Swifts|Chilminster Way|1150
Barkport Rovers|Heath Ground|2400
Ickwell FC|Ickwell Lane Ground|900
Goldgate FC|Kingfisher Lane|2850
Lamdale United|The Hollow|2200
Pikebrook FC|Pikebrook Stadium|3250
Shipholt Athletic|The Moor|950
Foxchurch Sports|Foxchurch Field|1150
AFC Winthorpe|Foundry Stadium|1050`,
  },
  // ---------------- Step 6 (div 10)
  {
    key: 'NL2', div: 10, name: 'Tyne & Tees League Division One', short: 'Tyne & Tees D1', lat: 54.7, lon: -1.6, feeds: 'NL1',
    clubs: `Kirkbrook Rovers|Abbey Park
Hamholt United|The Green|2550
Hencott Town|Hencott Way|2000
Wyford Town|The Moor|2650
Coldcott Town|The Paddocks
Hamdale Celtic|Quarry Lane
Brackcombe Rangers|Orchard Ground
Wilholt United|Rectory Lane
AFC Hollthorpe|Hollthorpe Recreation Ground|3050
Longdale Borough|Longdale Park Road
Great Denchurch United|Denchurch Lane Ground
Ormton Rovers|Rectory Lane
Stonecott Athletic|Stonecott Way
Stavwood Rangers|Stavwood Park Road
Barington FC|Barington Park Road
Brockdale Town|Brockdale Field
Bramdale Celtic|Foundry Meadow|1350
Saxsey Town|Saxsey Field
Carrlow Harriers|Carrlow Park Road|1400
AFC Sandmouth|Sandmouth Lane
Great Fenhurst Corinthians|Market Stadium|3350
Little Ashsey Town|Ashsey Lane Ground|2800`,
  },
  {
    key: 'NCE1', div: 10, name: 'Ridings League Division One', short: 'Ridings D1', lat: 53.6, lon: -1.3, feeds: 'NCEP',
    clubs: `Larkstead United|Rectory Road|1000
Langmore Rangers|Quarry Stadium|2800
Merethorpe Swifts|Merethorpe Way|2050
Belbridge Town|The Croft|2750
AFC North Lindworth|Lindworth Lane|1150
Langby Rovers|Langby Park Road|550
Woodsey United|Quarry Meadow|950
Chilby Harriers|Chilby Lane Ground|2350
Chelfield Borough|Foundry Meadow|1750
Ramsfield Town|Ramsfield Field|2800
Walney Town|Walney Recreation Ground|3900
North Ivyport Town|Ivyport Road|650
Witcaster Rovers|Witcaster Park|1500
Brindale Sports|Brindale Lane|450
Dalsing United|Dalsing Lane Ground|2200
Ickmouth United|Ickmouth Road|1650
Hunmarsh United|The Moor|450
Glenchester United|Glenchester Lane|4550
Winworth United|Winworth Meadow|3550
Milling FC|Foundry Meadow|6650
AFC Rosham|Rosham Road|3100
Dorbourne Town|Dorbourne Ground|2100`,
  },
  {
    key: 'NWC1N', div: 10, name: 'Mersey Valley League Division One North', short: 'Mersey Valley D1 North', lat: 53.8, lon: -2.6, feeds: 'NWCP',
    clubs: `AFC Bickdale|Bickdale Lane
Ludney Town|Kingfisher Lane
Lindcliffe Town|Abbey Lane
Lunhaven Town|Jubilee Field
AFC Ilkgate|Elm Field
AFC Wilminster|Wilminster Field
Marwich Town|Marwich Road
Larkchester Rovers|Station Stadium
Thorndale Sports|Foundry Stadium
Keslow Wanderers|Kingfisher Road
Brockdon Athletic|Brockdon Way
Larkwell Rovers|Larkwell Stadium
Branwick FC|The Hollow
Luncliffe Athletic|Luncliffe Stadium
Brookton United|Brookton Way
East Scargate FC|Heath Meadow
Marlthorpe Town|Marlthorpe Recreation Ground
Dunby Borough|Dunby Meadow`,
  },
  {
    key: 'NWC1S', div: 10, name: 'Mersey Valley League Division One South', short: 'Mersey Valley D1 South', lat: 53.3, lon: -2.5, feeds: 'NWCP',
    clubs: `Barkmere Harriers|Wharf Lane
Aldwick FC|Aldwick Park
Market Childale Rovers|The Croft
Loxchurch United|Jubilee Meadow
Great Bilminster United|Priory Field
Chalwood Town|Elm Lane
Hartchester United|Coronation Meadow
Denford Borough|Denford Park
Lunholt Wanderers|Lunholt Meadow
Shelbourne United|Wharf Road
Granworth FC|Granworth Park
Claywell Swifts|Kingfisher Field
Fernbourne Rangers|Fernbourne Lane Ground
Norton Wanderers|Priory Park
AFC Bexchester|Bexchester Meadow
AFC Midstow|Midstow Way
Quarthorpe Town|The Meadows
Denham FC|Denham Stadium`,
  },
  {
    key: 'ML1', div: 10, name: 'Heartland League Division One', short: 'Heartland D1', lat: 52.5, lon: -1.8, feeds: 'MLP',
    clubs: `Little Redport Town|Brewery Field
AFC Woodworth|Market Lane
Blackford Town|Blackford Park|3650
Corholt United|Foundry Ground
Upper Rushcliffe United|Rushcliffe Way
Dorington Rovers|Victoria Road|2200
Mabthorpe Albion|Mabthorpe Lane
Loxney Borough|Railway Stadium|1500
Pikestow FC|Pikestow Park|2050
Huncliffe Athletic|Brewery Road|2250
Longcombe Albion|The Moor|3300
Ormborough Athletic|Castle Stadium
Kesdale FC|Kesdale Recreation Ground|1000
Vercott Rovers|Vercott Field
Ashworth Town|Chapel Lane|4250
Thornholt Rovers|Orchard Stadium
AFC Market Calton|Calton Meadow
Hedstow Rovers|Priory Field|2200
Uxdale Town|Uxdale Field|1700
Nutney FC|Nutney Ground
Burley Town|Common Park`,
  },
  {
    key: 'UC1', div: 10, name: 'Shires League Division One', short: 'Shires D1', lat: 52.6, lon: -0.6, feeds: 'UCPN',
    clubs: `Dunchester United|Dunchester Park
Brinchester FC|Brinchester Meadow
Stavfield Town|Castle Meadow
Gilwood Athletic|Gilwood Road|550
Bramwick Albion|The Croft
Cawmere Victoria|The Common
Old Pikewood United|The Common
Lamcott Colliery|The Paddocks|900
Quardale Athletic|Quardale Lane|3000
North Hawkbrook FC|Hawkbrook Park Road
Cogchurch Rovers|Foundry Road
Great Whiting Wanderers|Whiting Lane
Corcott Rovers|Corcott Park|900
Carrington Corinthians|Harbour Park|1850
Nutham Swifts|The Hollow
Coldport Town|Castle Meadow|1900
Bexbourne Town|The Oval|850
Walmere Town|Common Stadium|2800
Everington Wanderers|Market Meadow
Ottbury United|Ottbury Ground
Merecliffe Colliery|Merecliffe Lane|4400
Ridfield United|Priory Park|500
AFC Upper Chercaster|The Oval`,
  },
  {
    key: 'EC1N', div: 10, name: 'Fenland League Division One North', short: 'Fenland D1 North', lat: 52.6, lon: 1.1, feeds: 'ECP',
    clubs: `Brackden United|The Rec|2800
Lower Aldfield United|The Croft|2700
Greyby Town|Greyby Road|850
Merechester Town|Chapel Road|2700
Millford United|Priory Field
Bexbury Rovers|Kingfisher Meadow
Winby Sports|Winby Lane
Fenholt Corinthians|Fenholt Road|900
Brookford Colliery|Brookford Arena
Cherbrook United|Cherbrook Road|3400
Granchester United|The Pavilion|4500
Quarstow Borough|Quarstow Field
Marlington Borough|Marlington Arena
Walgate Olympic|Walgate Park|2700
Coldwood United|Abbey Ground
Henthorpe Olympic|Henthorpe Way|4200
Crowminster United|Orchard Road|2100
AFC Meresey|Meresey Lane
Fenfield Athletic|Mill Park|2600
Henchurch Athletic|Henchurch Way|2650`,
  },
  {
    key: 'EC1S', div: 10, name: 'Fenland League Division One South', short: 'Fenland D1 South', lat: 51.9, lon: 0.8, feeds: 'ESL',
    clubs: `Barwick Colliery|Barwick Field|5500
Brookwich FC|Brewery Stadium|3100
Verstow Borough|Verstow Recreation Ground|1950
Chalden FC|Heath Meadow|450
Rushcott Athletic|Rushcott Way|1800
Ickbridge Swifts|Ickbridge Park|3450
Woldborough Dynamos|Woldborough Lane|1850
Hedhaven Albion|Abbey Park|1900
Thornwich Sports|Thornwich Road|3250
Marlchurch Athletic|Willow Road|1400
Ramshurst United|Bridge Field|3050
Old Fenchester Rovers|Fenchester Park Road|2900
Lindstead Athletic|Lindstead Park Road|2600
Hamfield United|Hamfield Meadow|3100
Woldchurch United|Rectory Stadium|3100
Greybourne United|Greybourne Lane|1550
Penthorpe Rovers|Elm Ground|2700
Morworth Colliery|Orchard Lane|2700
Great Belmarsh Town|Victoria Field|3400
Granhurst United|The Meadows|2000
Moorsey Rovers|Market Meadow|1800`,
  },
  {
    key: 'SSM1', div: 10, name: 'Chiltern League Division One', short: 'Chiltern D1', lat: 51.9, lon: -0.4, feeds: 'SSMP',
    clubs: `Fencaster Colliery|Fencaster Park|1350
Hartney United|Hartney Meadow|850
Ridmore FC|The Green
Draycott Town|Draycott Way
Woodthorpe Town|Chapel Ground|1000
Shercaster Wanderers|Memorial Lane
Essby Rovers|Quarry Ground
Cherhurst Rovers|The Meadows
Kirkthorpe Rangers|Kirkthorpe Way|2000
Crowchester Corinthians|Rectory Stadium|2850
Ivyden Corinthians|The Moor|2650
Redbrook Corinthians|Redbrook Field
Aldhurst Colliery|Aldhurst Park Road|1050
Ravenstead Athletic|Ravenstead Road|1100
Fenport FC|Fenport Arena|900
Market Wilbridge United|Jubilee Road
Longbury United|Longbury Lane Ground|4350
Morthorpe Town|The Paddocks|1600
AFC Edenport|Castle Stadium|950
Belmouth FC|The Moor|1500
Langstow United|The Paddocks|2200`,
  },
  {
    key: 'HL1', div: 10, name: 'Cotswold League Division One', short: 'Cotswold D1', lat: 51.8, lon: -1.5, feeds: 'HLP',
    clubs: `Barhaven Sports|Memorial Field
Dunworth United|Memorial Road|1100
Penton Celtic|Bridge Park|950
Hunminster Borough|Quarry Lane|1400
Wexby Borough|Quarry Road|950
Hesbridge Wanderers|The Pavilion|1050
Belwell Colliery|Belwell Meadow|1850
AFC Old Hardon|Hardon Way|2750
Selden Athletic|Selden Recreation Ground|1050
Glenbury Town|Glenbury Field|950
Denbridge FC|Church Meadow|1000
Crowington Albion|The Pavilion|3150
Lindby Rangers|Foundry Park|1850
Larkminster Athletic|Bridge Ground|3100
Wrenbridge Town|Wrenbridge Field|2250
Yarcaster Sports|Willow Meadow|1450
Galwood United|Galwood Stadium
Glencombe Athletic|Station Park|2850`,
  },
  {
    key: 'CC1', div: 10, name: 'Downs League Division One', short: 'Downs D1', lat: 51.3, lon: -0.4, feeds: 'CCPN',
    clubs: `Whitford Town|Whitford Ground|1300
AFC Branbourne|Foundry Stadium|1100
Haythorpe United|Haythorpe Park Road|1800
Kesworth FC|Market Field|1600
Wadfield Town|Wadfield Field|1900
Dalsham United|Dalsham Park Road|3000
Yarthorpe Town|Railway Park|3800
Granford United|Granford Field
Sandham Rangers|Sandham Recreation Ground|2150
Ashbury Colliery|The Oval|1100
Quarchester Sports|Quarchester Ground|3800
South Hunmarsh Corinthians|Hunmarsh Field|1900
Ferncombe United|Ferncombe Way|800
Moorfield Wanderers|Mill Road|2400
Shelthorpe Dynamos|Kingfisher Lane|3450
Ravenwich Town|Ravenwich Park|2100
Barwich United|Heath Ground|1200
Cherham FC|Chapel Lane|1050
Bickwich Rovers|Bickwich Way|1650
Greystead United|The Oval|1000
Melwood Borough|The Hollow|2550
Hambury United|The Paddocks|1800
Dreylow Town|Harbour Lane|2200`,
  },
  {
    key: 'SCF1', div: 10, name: 'South Coast League Division One', short: 'South Coast D1', lat: 50.9, lon: -0.2, feeds: 'SCFP',
    clubs: `Cherby United|Jubilee Field|500
Wilington United|Harbour Stadium
Rushton Borough|The Oval|2050
Tetcliffe Borough|Common Lane
Rookton Sports|Bridge Ground|1250
Blackstead Athletic|Brewery Park|3150
Goldford FC|Goldford Recreation Ground|1000
Wadstow United|Harbour Road|2700
Moordon Corinthians|The Moor
Haymarsh Rovers|Foundry Meadow
Calchester Town|The Hollow|1000
Stanby Town|Stanby Lane Ground
Bringate Athletic|Jubilee Ground
Ickchurch Corinthians|Bridge Field
Lindhurst Town|Lindhurst Road
East Chalbourne Town|Kingfisher Park|850
Bilsey Borough|Railway Meadow
Whitsey FC|The Oval|1550`,
  },
  {
    key: 'SCE1', div: 10, name: 'Weald League Division One', short: 'Weald D1', lat: 51.3, lon: 0.5, feeds: 'SCEP',
    clubs: `Kirkney FC|The Paddocks
Hesgate FC|Hesgate Lane Ground|1600
Ottholt Town|Quarry Road
Norcombe Swifts|Wharf Ground|2950
Hunham Wanderers|Hunham Arena|8850
Mabcombe Sports|Mabcombe Park
North Fairdale Borough|The Moor|1100
Larkfield United|Orchard Road|4200
Longley FC|The Moor
Woodton Corinthians|Woodton Park Road|600
Sandholt FC|Sandholt Road|1100
Wenport Rovers|The Meadows|1050
Corley Town|The Meadows|4700
Tavbury Town|Tavbury Lane|1450
Chelcott Town|Chelcott Way|900
Selthorpe Athletic|Chapel Park|1050
Harthurst FC|Jubilee Stadium|2100
Ormlow Wanderers|Quarry Field`,
  },
  {
    key: 'WX1', div: 10, name: 'Solent League Division One', short: 'Solent D1', lat: 50.9, lon: -1.4, feeds: 'WXP',
    clubs: `Loxlow Albion|Loxlow Park Road|1650
Stavchester Town|Stavchester Lane|950
Brookstead Sports|Brookstead Way|1000
Heathgate Athletic|Heathgate Field|2650
Crowcott Rangers|The Green|2250
Fairminster Town|Fairminster Ground|4800
Yarby Athletic|Yarby Lane|4000
Haghurst Borough|Haghurst Road
Market Hunhurst Borough|Hunhurst Way|950
AFC Brambourne|Market Lane|1150
Ilkborough Harriers|Heath Meadow|950
Warlow Colliery|Brewery Stadium|1850
Lamthorpe Athletic|Lamthorpe Lane Ground|950
Bexhaven Rovers|The Rec
Morcaster Town|Morcaster Stadium|950
Dendale Town|Dendale Lane|1100
East Cormere Town|Orchard Park|1100
Chilcombe Athletic|The Paddocks
Edenbury FC|Market Stadium|1550
Branborough FC|Market Road|950
Saxworth Athletic|Saxworth Park Road|900
AFC Dunstead|The Pavilion|450`,
  },
  {
    key: 'WE1', div: 10, name: 'Severn League Division One', short: 'Severn D1', lat: 51.3, lon: -2.6, feeds: 'WEP',
    clubs: `Nordon FC|Nordon Lane Ground|1000
Crancaster Athletic|Crancaster Ground
Selcaster Sports|Selcaster Meadow
Kelmore FC|Harbour Stadium
Chadcott Sports|Station Meadow|850
Warcott Rangers|Warcott Field
Dormouth FC|Dormouth Park|2600
Taming Celtic|Taming Lane
Carrmere Wanderers|Carrmere Meadow|2750
Chadbourne Rangers|Chadbourne Lane|1050
Hedworth Harriers|Harbour Ground|2900
Bilbrook FC|Orchard Park|850
Rookham Borough|Elm Meadow|1000
Penden Corinthians|Railway Park|950
Penchurch Town|The Common|1100
Bickcott Town|Coronation Road|900
Chering FC|Chering Field|1100
Hescombe United|Hescombe Meadow|900
Scarmarsh Town|Church Stadium|1400
Bilbury Town|Elm Stadium|2250`,
  },
  {
    key: 'SWPE', div: 10, name: 'Peninsula League East', short: 'Peninsula East', lat: 50.6, lon: -3.6, feeds: 'WEP',
    clubs: `Ilkwood United|Ilkwood Lane Ground|1950
Lamhurst Swifts|Lamhurst Recreation Ground|1050
Essdale Corinthians|Mill Park|1050
Calholt FC|Quarry Road|2050
Stavbourne Athletic|Stavbourne Way|1800
Market Marlcliffe Athletic|Marlcliffe Arena|3800
Tadcliffe Athletic|Bridge Lane|1750
Dorbridge Athletic|Dorbridge Meadow|1000
Ormfield Town|Ormfield Meadow|2000
Stancombe Athletic|Stancombe Recreation Ground|1100
AFC Ridmarsh|Quarry Park|1100
Everford Sports|Everford Stadium
Chilmarsh United|Chilmarsh Road|1750
Redthorpe United|Railway Meadow|1650
Edenby Wanderers|Willow Road|1100`,
  },
  {
    key: 'SWPW', div: 10, name: 'Peninsula League West', short: 'Peninsula West', lat: 50.3, lon: -4.9, feeds: 'WEP',
    clubs: `Barcliffe United|Barcliffe Stadium|2750
Hedham Sports|Castle Stadium|1050
Pikemarsh Town|Wharf Field|3050
Coldworth Rovers|Coldworth Ground|1950
Moorney Town|Coronation Field|3100
Berholt Rovers|Berholt Stadium|1000
Bercaster Albion|Bridge Lane|800
Essham FC|Elm Road|2050
Quardon FC|Quardon Meadow
Blackbridge Celtic|Blackbridge Meadow|1100
Wenhurst United|Wenhurst Stadium|2950
Chadcaster Athletic|Chadcaster Lane Ground|2250
Old Ramsford United|Ramsford Field|1000
AFC Great Brackbridge|Brackbridge Park|2150
Padstead FC|Padstead Field|1100
Dalsbury Celtic|Dalsbury Lane Ground|450`,
  },
];

/** Division OVR bands (DESIGN.md 4.4): average starter OVR per division. */
/** The pyramid this build plays (DESIGN 13.2y). */
export const LEAGUES: LeagueDef[] = REAL_WORLD ? REAL_LEAGUES : FICTIONAL_LEAGUES;

export const DIV_AVG_OVR = [0, 80, 72, 66, 61, 56, 52, 48, 44, 40, 36];
