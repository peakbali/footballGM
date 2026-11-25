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

export const LEAGUES: LeagueDef[] = [
  {
    key: 'PL', div: 1, name: 'Premier Division', short: 'Premier', lat: 52.5, lon: -1.5,
    clubs: `Belwell Harriers|Bridge Ground|60704
Walwood Colliery|Walwood Arena|42640
Woldmere Athletic|Common Road|11307
Ottwick Swifts|Bridge Arena|17250
Falstow FC|Castle Stadium|31876
Whitham Olympic|Whitham Meadow|21944
Quenham Olympic|Station Lane|40343
Ashbridge United|Abbey Meadow|25486
Dunbridge Town|Harbour Stadium|52888
AFC Ulstead|Riverside Park|29589
Rushstead Dynamos|Common Ground|37645
Coldwood FC|Hillside Road|61276
Oakbridge Victoria|Oakbridge Stadium|55017
Woldbury Colliery|Quarry Road|74197
Lindfield Rovers|Lindfield Park|52305
Ormwell Sports|Ormwell Lane|30404
Ashmouth Celtic|Willow Ground|49000
Ludham Victoria|Foundry Park|62850
Ramston Rangers|Ramston Arena|62500
Ulwood Sports|The Arena|31750`,
  },
  {
    key: 'CH', div: 2, name: 'First Division', short: 'First Div', lat: 52.5, lon: -1.5,
    clubs: `Calmore FC|Calmore Ground|29409
Ilkholt Victoria|Ilkholt Road|31367
Dreygate Athletic|Dreygate Road|27000
AFC Aldford|Aldford Road|27111
Rushby Rangers|Rushby Road|32609
Morwick Harriers|Castle Road|32956
Greybury FC|Greybury Park|25586
AFC Scardale|Bridge Park|30056
Kesgate Corinthians|Kesgate Park|32259
Carrcliffe Sports|Willow Road|34742
Wymouth Town|Mill Arena|20146
Rushworth Corinthians|Elm Field|27359
Bixbrook Athletic|Bixbrook Ground|12500
Rushminster Town|Common Road|20867
Greyford Corinthians|Hillside Ground|23404
AFC Bramthorpe|Bramthorpe Stadium|18439
AFC Wexmere|Orchard Lane|32050
Foxham Olympic|Abbey Park|39732
Gilby Town|The Citadel|32384
Dreyholt Town|The Arena|30089
AFC Belbridge|Meadow Arena|21088
Millstead Dynamos|The Citadel|22200
Nutholt City|Nutholt Field|26688
Langwell Villa|Market Ground|12600`,
  },
  {
    key: 'L1', div: 3, name: 'Second Division', short: 'Second Div', lat: 52.5, lon: -1.5,
    clubs: `Cherminster Athletic|Market Park|9215
Tamholt Wanderers|Tamholt Arena|23287
Rushham Town|Rushham Meadow|16616
Falmere Town|Heath Lane|28723
Quenby United|Orchard Meadow|25136
Saxley United|Saxley Meadow|6912
Glenminster Rovers|Glenminster Lane|33280
Hollbury Villa|Castle Stadium|15231
Aldmouth Celtic|Foundry Park|8714
Kingsholt Celtic|Kingsholt Lane|24121
Falby Swifts|Beacon Park|9271
Selcliffe Rovers|Meadow Field|10669
Paddale Town|Orchard Road|12000
Pikeworth Rovers|Castle Lane|9186
Hartbridge FC|Bridge Ground|7798
Shelford Dynamos|Orchard Field|15314
Belford FC|Belford Meadow|17900
AFC Gilholt|The Arena|15036
Saltmere Town|Saltmere Field|24161
Kelwell FC|Abbey Arena|12021
Cherstead Rangers|Cherstead Field|7800
Kesthorpe Villa|Beacon Meadow|10852
Claymore Wanderers|Claymore Road|25138
Vercott Wanderers|Common Lane|9448`,
  },
  {
    key: 'L2', div: 4, name: 'Third Division', short: 'Third Div', lat: 52.5, lon: -1.5,
    clubs: `Morhurst Rovers|Orchard Stadium|5450
AFC Moorcliffe|Kingsway Road|6500
Tamfield Villa|Tamfield Stadium|5045
Rookhurst Rangers|Willow Field|9832
Bramgate City|Willow Road|5300
AFC Foxby|Quarry Park|8127
Langby Victoria|Langby Road|7066
Cogdale Town|Quarry Ground|10504
Uxbrook Harriers|Brook Road|10105
Sandwick Dynamos|Elm Park|6134
Pencliffe Villa|Beacon Field|10153
AFC Yarwick|Yarwick Field|5327
Calcott Rovers|Station Arena|11582
Wexholt Town|Wexholt Field|9052
Everley Athletic|Everley Lane|5000
Kelcombe Wanderers|Hillside Stadium|30500
Standale United|Standale Lane|7850
Dalsdale Rovers|Elm Road|19841
Coldworth United|Market Field|13513
Ormholt Town|Willow Arena|5108
Uxminster Wanderers|Bridge Park|9875
Sandholt FC|Sandholt Arena|15728
Tetcott Rovers|Tetcott Road|16567
Netherfield Rovers|Netherfield Stadium|11300`,
  },
  {
    key: 'NL', div: 5, name: 'National Division', short: 'National', lat: 52.5, lon: -1.5,
    clubs: `Lunminster Borough|Quarry Field|7100
Belwood Rovers|Foundry Field|7700
Essminster City|Essminster Stadium|4502
Ramsworth Town|Ramsworth Field|5061
AFC Calstead|Calstead Lane|3500
Fencombe FC|Heath Ground|4222
Faldale Rovers|Castle Road|17949
Selholt Rangers|Selholt Road|5250
Ramsborough Albion|Canal Ground|10400
AFC Grancombe|Grancombe Arena|5147
Foxwick Dynamos|Foxwick Meadow|11800
Tadminster Wanderers|Castle Arena|7856
Shelley Swifts|Foundry Park|6476
Gilmere Albion|Bridge Ground|10249
Pellcott Villa|Pellcott Park|9088
Rushwood Athletic|Willow Stadium|5500
Halfield Athletic|Victoria Arena|12392
Kelfield Olympic|Foundry Park|5013
Cogmouth Victoria|Beacon Lane|4565
Gilcott Athletic|Willow Field|3600
Wrenby United|Mill Stadium|4085
AFC Pikeholt|Mill Park|6036
Brackhurst Wanderers|Castle Park|9566
Tetgate Town|Oak Arena|8500`,
  },
  // ---------------- Step 2 (div 6)
  {
    key: 'NLN', div: 6, name: 'National North', short: 'Nat North', lat: 53.4, lon: -2.0,
    clubs: `Marlwell Rovers|Elm Ground|6000
Shelminster Celtic|Quarry Stadium|6300
Ickstead Wanderers|Riverside Road|3600
Mordale Athletic|Abbey Park|3000
Walborough Harriers|Quarry Lane|5200
Elmhurst FC|Elmhurst Stadium|5400
AFC Foxmouth|Foxmouth Ground|4100
Halford Borough|Hillside Lane|4000
Walstead Celtic|Meadow Road|3300
Wendale Harriers|Elm Road|5250
Scarholt FC|Scarholt Arena|6238
Chalwood Dynamos|Chalwood Stadium|8200
Fernham United|Bridge Arena|3050
Wenbury Victoria|Foundry Meadow|5300
Shelfield United|Shelfield Ground|2200
Ockmore Rangers|Ockmore Stadium|4000
Dalsmere Villa|Dalsmere Stadium|3500
Draymere Villa|Church Park|2300
Marlmore Rovers|Marlmore Park|3500
Stoneworth Olympic|Stoneworth Stadium|3251
Marlcott Sports|Castle Field|4000
Mormouth Dynamos|Mormouth Arena|6008
Cogcombe Rangers|Cogcombe Road|4300
Goldley United|Beacon Lane|2500`,
  },
  {
    key: 'NLS', div: 6, name: 'National South', short: 'Nat South', lat: 51.3, lon: -0.8,
    clubs: `Pikeley Victoria|Pikeley Park|3000
Yarstead Albion|Yarstead Ground|8840
Brammouth Wanderers|Brammouth Park|3502
Cogbury Rovers|Harbour Park|5000
Stanholt FC|Kingsway Park|3000
Elmford Town|Elm Road|6078
Thornwood Corinthians|Thornwood Field|4250
AFC Hagmouth|Chapel Park|6500
Beldale Celtic|Beldale Ground|4151
Millford Celtic|Millford Field|4800
Hawkmere Sports|Church Meadow|2500
Ravenborough Rangers|Castle Park|7000
Edenfield Athletic|Elm Ground|3500
Rookborough Dynamos|Beacon Meadow|3152
Padmouth Town|Padmouth Park|3500
Hollinwell Celtic|Brook Field|3000
Hartby Villa|Hartby Road|4000
Ilkgate Swifts|Ilkgate Stadium|4200
Saltwood Town|Saltwood Ground|5000
Crowcliffe Borough|Kingsway Ground|2000
Yarthorpe Town|Abbey Ground|3000
AFC Belworth|Elm Meadow|6500
Elmwell Swifts|Bridge Park|3500
Brookbury United|Chapel Park|4000`,
  },
  // ---------------- Step 3 (div 7)
  {
    key: 'NPLP', div: 7, name: 'North Premier', short: 'North Premier', lat: 53.6, lon: -1.9, feeds: 'NLN',
    clubs: `Ivyford Athletic|Ivyford Ground|4500
Wrendale United|Wrendale Park|2642
Hawkhurst Borough|Riverside Arena|1000
Ivymouth Victoria|Station Park|4400
Wexthorpe Sports|Brook Park|4304
Coldbrook Dynamos|Coldbrook Park|4000
Thornminster Athletic|Harbour Lane|1500
Edenhurst Wanderers|Edenhurst Road|6039
Kingsstead Wanderers|Orchard Ground|4250
Ickwell Rangers|Harbour Meadow|3029
Crowbury Rovers|Foundry Ground|3500
Goldcliffe Town|Kingsway Meadow|3600
Claystead Athletic|Castle Park|1500
Chalbury Celtic|Chalbury Meadow|2070
Lunwell Town|Station Arena|1400
Dunbury Borough|Dunbury Park|3500
Heathbrook Town|Brook Lane|2200
Sandthorpe Colliery|Sandthorpe Park|1345
Greycott Albion|Heath Meadow|2500
AFC Brookstead|Kingsway Lane|3500
Rookley Rovers|Rookley Ground|3101`,
  },
  {
    key: 'SLPC', div: 7, name: 'Central Premier', short: 'Central Premier', lat: 52.4, lon: -1.2, feeds: 'NLN',
    clubs: `Saltwick Rovers|Saltwick Meadow|2500
Oakbrook Athletic|Hillside Road|3000
Faircott Rangers|Harbour Park|3116
Hartminster Swifts|Hartminster Field|2500
Hawkbrook Borough|Canal Park|4525
Kesmouth FC|Kesmouth Meadow|3500
Norminster Rangers|Hillside Road|3500
Hartmouth Wanderers|Oak Lane|3150
Clayhurst Town|Clayhurst Road|1000
Fairmouth Olympic|Market Arena|3029
Hawkgate Sports|Hawkgate Arena|2250
Stonegate Athletic|Orchard Arena|4000
Edenstead Corinthians|Edenstead Field|1477
Ashthorpe United|Riverside Road|1500
Hartwood Athletic|Hartwood Arena|5000
AFC Cranham|Quarry Park|5000
Everhurst Harriers|Station Stadium|2700
AFC Wywick|Harbour Ground|2000
Clayholt Victoria|Castle Road|2000
Moorgate Colliery|Moorgate Ground|2035
Glenley Albion|Quarry Field|2000
Wexdale Harriers|Wexdale Road|12067`,
  },
  {
    key: 'SLPS', div: 7, name: 'South West Premier', short: 'SW Premier', lat: 51.0, lon: -2.2, feeds: 'NLS',
    clubs: `Larkbridge Dynamos|Bridge Stadium|2000
Marlford Athletic|Church Arena|1950
Granworth Olympic|Castle Lane|1950
Keswell Town|Keswell Park|2500
Elmdale Rangers|Beacon Road|5229
Stonethorpe City|Riverside Park|3000
Kirkby Harriers|Kirkby Park|1500
Cogstead Swifts|Market Road|4000
Ickstow United|Elm Lane|4500
Quarthorpe Celtic|Chapel Road|3000
Henley Wanderers|Abbey Park|5300
Hollincombe Town|Oak Ground|2500
Belbrook Villa|Common Ground|3500
Scarminster Celtic|Abbey Meadow|2500
Wexley FC|Canal Meadow|2500
Stonemore United|Stonemore Park|3000
Granby Rangers|Elm Stadium|3500
Chalcombe Athletic|Chalcombe Lane|3770
Calbury Athletic|Kingsway Park|2097
Edenham Harriers|Edenham Ground|6600
Fairstead Town|Hillside Field|3250
Loxgate Rangers|Loxgate Meadow|2000`,
  },
  {
    key: 'ISTP', div: 7, name: 'South East Premier', short: 'SE Premier', lat: 51.4, lon: 0.3, feeds: 'NLS',
    clubs: `Greythorpe Town|Greythorpe Road|3500
Ockbury Celtic|Meadow Arena|4800
Burmere Town|Burmere Ground|1500
Belstead Athletic|Victoria Field|2500
Whitstead Rovers|Whitstead Park|4100
Tetwell Swifts|Oak Ground|5000
Pellmore Rovers|Quarry Field|5000
Brambrook Villa|Brambrook Lane|3174
Selthorpe Rovers|Quarry Ground|2000
Padley Corinthians|Padley Field|1550
Ilkham Harriers|Castle Ground|2500
Crowcott Swifts|Chapel Meadow|4100
Cherworth Colliery|Orchard Lane|3334
Uxborough Borough|Meadow Road|4000
AFC Hartcliffe|Hartcliffe Ground|3500
Tethurst Town|Tethurst Park|3000
Saxwell United|Saxwell Stadium|2000
Ivyfield Athletic|Station Park|3500
Norwick Corinthians|Church Ground|5007
Walley United|Quarry Park|4000
Norfield Town|Kingsway Road|3126
Coldcombe Victoria|Harbour Meadow|2638`,
  },
  // ---------------- Step 4 (div 8)
  {
    key: 'NPLE', div: 8, name: 'North East League', short: 'North East', lat: 54.0, lon: -1.3, feeds: 'NPLP',
    clubs: `Bixminster Town|Bixminster Road|2000
Lindmore Albion|Brook Stadium|1950
Saltwell Town|Saltwell Lane|4435
Saltcott Villa|Brook Ground|1000
Crowford Town|Foundry Arena|3500
Scarstow Athletic|Church Park|3000
Yarbridge United|Orchard Park|1000
Wyby Celtic|Meadow Field|3770
Waldale Town|Quarry Meadow|2500
Larkbury Borough|Larkbury Lane|2000
Thornstead Town|Thornstead Lane|3000
Ulbrook Rovers|Ulbrook Field|1250
Coldhurst Borough|Coldhurst Park|1665
Uxmore Borough|Uxmore Ground|2000
Aldmere Wanderers|Aldmere Stadium|2714
Fairley Wanderers|Fairley Park|2400
Calwood Borough|Foundry Road|1000
Bramham Villa|Bramham Park|3000
Hartgate Rovers|Foundry Road|3280
Thornwick Town|Hillside Arena|1200
Fernbridge Corinthians|Fernbridge Road|1000
Granwell Corinthians|Victoria Field|1500`,
  },
  {
    key: 'NPLW', div: 8, name: 'North West League', short: 'North West', lat: 53.6, lon: -2.7, feeds: 'NPLP',
    clubs: `Wygate United|Wygate Park|2500
Tadhurst Harriers|Quarry Stadium|1500
Ridcombe Rovers|Willow Park|2500
Essborough Dynamos|Canal Lane|12500
Wyfield Town|Wyfield Meadow|3000
Dalsley Colliery|Harbour Road|2000
AFC Ashbrook|Beacon Road|1500
AFC Drayfield|Heath Road|1000
Scarwick Town|Foundry Lane|2000
Uxcott Swifts|Victoria Meadow|1000
Ferncliffe City|Kingsway Stadium|4000
Aldbrook Dynamos|Willow Park|3500
Shelcombe Harriers|Brook Lane|4000
Ottbury Colliery|Ottbury Road|1600
Uxthorpe City|Heath Meadow|1500
Sandborough Rovers|Castle Field|5000
Dreybury Town|Dreybury Arena|4150
Heathminster Swifts|Canal Field|6500
Crowdale City|Elm Park|2500
Morminster Olympic|Quarry Stadium|3300
Stonebrook Wanderers|Stonebrook Arena|4813
Coldbridge Olympic|Coldbridge Road|1320`,
  },
  {
    key: 'NPLM', div: 8, name: 'Midlands League', short: 'Midlands', lat: 52.8, lon: -1.3, feeds: 'SLPC',
    clubs: `AFC Draycliffe|Mill Arena|2955
Nordale Harriers|Heath Field|1000
Padby FC|Quarry Meadow|1600
Elmminster Dynamos|Elmminster Park|2900
Mabley Celtic|Mabley Road|2650
Langstow Swifts|Langstow Meadow|2500
Hollford Rovers|Hollford Field|2000
Belley Athletic|Belley Road|1968
Chercliffe Colliery|Meadow Road|2000
Pellborough Swifts|Pellborough Park|3893
Kingsminster Athletic|Hillside Field|1000
Netherhurst Town|Foundry Field|1500
Ivywick Town|Chapel Arena|1500
Wenstead Dynamos|Wenstead Road|3300
Edenford Harriers|Edenford Ground|1500
Penwood Swifts|Penwood Arena|2100
AFC Stonehurst|Riverside Park|1000
Padcliffe Harriers|Padcliffe Road|5000
Nutton Town|Nutton Road|2500
Ockborough Dynamos|Hillside Road|3500
Loxdale United|Brook Field|2000
Cranholt United|Castle Park|5000`,
  },
  {
    key: 'SL1C', div: 8, name: 'Central League', short: 'Central', lat: 52.0, lon: -0.7, feeds: 'SLPC',
    clubs: `Falthorpe Borough|Canal Meadow|3065
Fairmere Dynamos|Fairmere Road|5000
Kingsthorpe Olympic|Quarry Arena|4000
Yarfield Athletic|Yarfield Park|3500
Kirkborough Town|Kirkborough Road|3000
Brackcombe Celtic|Riverside Park|3000
Granham Town|Granham Park|4525
Brackmore Corinthians|Oak Road|2000
Oakcott Albion|Canal Arena|2000
Loxmore Albion|Orchard Meadow|6500
Rookham Olympic|Riverside Park|3529
Henmouth Sports|Beacon Field|2800
Haghurst Celtic|Brook Road|1500
Wyworth Town|Elm Road|1500
Hagwood City|Hagwood Field|3000
Chercombe Corinthians|Mill Park|1500
Hagwick Borough|Hagwick Park|3075
Fenbridge Celtic|Meadow Road|1000
Hawkley City|Beacon Meadow|1500
Hawkham FC|Hawkham Park|2500
Rookdale Olympic|Heath Ground|3300
Kesborough United|Kesborough Stadium|3000`,
  },
  {
    key: 'SL1S', div: 8, name: 'South West League', short: 'South West', lat: 51.2, lon: -2.4, feeds: 'SLPS',
    clubs: `Halton Villa|Kingsway Road|4250
Essmore Villa|Essmore Lane|6000
Greywick Wanderers|Orchard Arena|1500
Caldale Athletic|Elm Ground|1700
AFC Tamgate|Bridge Lane|2000
Dunholt Harriers|Orchard Field|3000
Nutmere Rovers|Nutmere Park|1500
Dreyby Wanderers|Castle Road|3572
AFC Woldcott|Woldcott Road|3000
Thornholt Wanderers|Thornholt Field|2000
Ulcombe Wanderers|Oak Meadow|1429
Brackwood Olympic|Station Park|2500
Lunworth Villa|Riverside Park|2500
Walgate Rangers|Brook Stadium|1400
Chalbrook Sports|Mill Ground|2500
Larkmouth Villa|Larkmouth Field|500
Uxmere Colliery|Brook Ground|2000
Lindcombe City|Bridge Field|2000
Yarbrook United|Bridge Arena|2500
Lindthorpe United|Common Road|1000
Ottcliffe FC|Abbey Road|4500
Claybury Athletic|Beacon Park|3500`,
  },
  {
    key: 'ISTN', div: 8, name: 'East League', short: 'East', lat: 51.8, lon: 0.6, feeds: 'ISTP',
    clubs: `Gilcombe Town|Castle Park|3500
Cranworth Athletic|Market Arena|1200
Wrenbridge Albion|Wrenbridge Meadow|2000
Carrwell Villa|Carrwell Road|3000
AFC Nutfield|Nutfield Road|3300
Tamcliffe Borough|Oak Stadium|1000
Norley Athletic|Kingsway Field|2160
Essholt Wanderers|Meadow Arena|3600
Belcott Celtic|Belcott Road|4000
AFC Loxby|Common Meadow|3000
Tetbrook Corinthians|Tetbrook Park|3000
Bramfield Harriers|Bramfield Lane|2800
Dreycliffe Dynamos|Dreycliffe Field|2000
Pellbrook Villa|Pellbrook Ground|2750
Cogcliffe United|Market Park|3000
Yarholt Athletic|Harbour Ground|1500
Wrenthorpe Colliery|Wrenthorpe Road|2000
Scarford Dynamos|Scarford Meadow|4000
Nutstead Town|Riverside Arena|550
Ilkwood Olympic|Station Field|3500
Dreythorpe Sports|Abbey Field|2500
Netherham Town|Netherham Park|2500`,
  },
  {
    key: 'ISTSC', div: 8, name: 'South Central League', short: 'South Central', lat: 51.4, lon: -0.4, feeds: 'ISTP',
    clubs: `AFC Fairton|Abbey Field|1500
Belcombe United|Belcombe Road|1150
Ottmore Borough|Riverside Road|3000
Kelwick Celtic|Kelwick Lane|1000
Saltbridge Athletic|Harbour Park|4500
Pencombe Town|Pencombe Field|5500
Ormstow Town|Ormstow Arena|4500
Chalholt Celtic|Chalholt Stadium|1000
Chalhurst Dynamos|Chalhurst Road|3070
Brackbrook Albion|Beacon Lane|2000
Wyholt Villa|Willow Road|3000
Wencott Athletic|Quarry Park|1990
Edencliffe Colliery|Heath Park|2000
Netherwell Dynamos|Netherwell Road|3500
Shelcott Villa|Shelcott Road|2000
Brackwell Rangers|Brackwell Meadow|4000
Verby Albion|Verby Lane|3000
Kirkcliffe Villa|Kirkcliffe Stadium|1180
Cherbridge United|Cherbridge Road|1900
Chermore Town|Chermore Arena|2000
Cranbury FC|Cranbury Road|3000
Thornworth Harriers|Thornworth Stadium|1500`,
  },
  {
    key: 'ISTSE', div: 8, name: 'South East League', short: 'South East', lat: 51.1, lon: 0.4, feeds: 'ISTP',
    clubs: `Cherby City|Kingsway Meadow|3000
Chalford Colliery|Chalford Road|2000
AFC Kescott|Church Meadow|3200
Elmton City|Elmton Lane|4000
Saxmore Rovers|Willow Field|2000
Bramwell FC|Foundry Road|2000
Heathbridge Colliery|Chapel Park|2000
Saltfield Dynamos|Oak Road|3000
Kesbury Swifts|Kesbury Lane|3000
Everwick Rovers|Heath Park|1000
Pendale Rovers|Pendale Road|2000
Walford Albion|Castle Arena|1000
Ickholt Athletic|Elm Stadium|4050
Faircliffe Harriers|Oak Park|3000
AFC Mabfield|Harbour Road|2000
Yarmere Borough|Castle Meadow|2100
Henholt Harriers|Henholt Lane|2500
Dalsbury Harriers|Bridge Park|1500
Draymouth Villa|Draymouth Field|1530
Sandwell Victoria|Oak Arena|1930
Belbury Olympic|Beacon Ground|1500
Coldton Rovers|Market Park|1180`,
  },
  // ---------------- Step 5 (div 9) - the player starts here
  {
    key: 'NL1', div: 9, name: 'Tyne & Tees League Premier', short: 'Tyne & Tees Premier', lat: 54.7, lon: -1.6, feeds: 'NPLE',
    clubs: `Granminster Borough|Willow Arena
Rushdale Sports|Hillside Lane|2000
Brackstead Rovers|Elm Meadow|4500
Edenbrook Swifts|Quarry Road|2000
Walmore Borough|Walmore Meadow|2000
AFC Brackwick|Brackwick Park|2500
Verborough United|Heath Park
Goldwell Town|Beacon Park|1500
Pikeham Athletic|Oak Arena
Ulham Town|Kingsway Park
Henworth FC|Quarry Arena
Walminster Celtic|Walminster Ground|1500
Edendale Victoria|Bridge Stadium|2000
Moorbury Rovers|Market Park|5000
Dreystead Town|Orchard Road
Woldford Rovers|Woldford Ground|2500
Goldmere Villa|Goldmere Road|1500
AFC Kesham|Kesham Ground|4000
Wenminster Town|Orchard Stadium`,
  },
  {
    key: 'NCEP', div: 9, name: 'Ridings League Premier', short: 'Ridings Premier', lat: 53.6, lon: -1.2, feeds: 'NPLE',
    clubs: `Lindstow Celtic|Lindstow Arena|500
Pikestow Victoria|Pikestow Meadow|3000
Hawkminster Borough|Harbour Road|1500
Ockcombe Athletic|Ockcombe Road|1000
Thornhurst Wanderers|Beacon Stadium|1000
Greyborough United|Bridge Meadow|2225
Dalsminster Athletic|Castle Arena|2087
Whitholt Wanderers|Hillside Lane|1200
Saltdale Town|Saltdale Field|2500
Selton United|Orchard Road|800
Gilworth Rovers|Gilworth Meadow|1000
Ickmouth Dynamos|Church Field|2000
Greyworth United|Common Road|1000
Mabworth Sports|Mabworth Ground|1000
Cogworth Villa|Bridge Stadium|2000
Saltton Olympic|Harbour Park|2000
Marlstow Town|Canal Park|2089
Tadton Town|Heath Road|2000
Brookdale Rovers|Brookdale Stadium|3000
Uxbury Colliery|Oak Park|500`,
  },
  {
    key: 'NWCP', div: 9, name: 'Mersey Valley League Premier', short: 'Mersey Valley Premier', lat: 53.5, lon: -2.6, feeds: 'NPLW',
    clubs: `Oakfield United|Oakfield Arena
Rushfield Harriers|Chapel Road
Saltholt Swifts|Station Meadow
Pikemere Athletic|Pikemere Lane
Cranley FC|Meadow Road
Bramstead Town|Beacon Road
Halcott Athletic|Canal Field
AFC Pikebridge|Canal Meadow
Greywood Villa|Brook Meadow
Kelton Colliery|Kelton Park
AFC Ashgate|Hillside Arena
Pikestead Rovers|Meadow Stadium
Norborough Victoria|Norborough Arena
Ridfield Harriers|Common Road
Langhurst FC|Market Road
Fairmore United|Kingsway Meadow
Kelgate Rangers|Chapel Road
Verwell Wanderers|Heath Road
Woldstow Town|Abbey Lane
Dalsbrook Harriers|Foundry Field
Walby FC|Canal Ground
Brackbridge Rovers|Chapel Park
Glenholt Sports|Orchard Park
Raventon United|Orchard Lane`,
  },
  {
    key: 'MLP', div: 9, name: 'Heartland League Premier', short: 'Heartland Premier', lat: 52.5, lon: -1.9, feeds: 'NPLM',
    clubs: `Foxfield FC|Foundry Park|3000
Selwick Colliery|Selwick Park
Brookbrook Dynamos|Beacon Road|2000
Loxhurst Dynamos|Loxhurst Ground|1500
Fairbrook Athletic|Fairbrook Road
Tamstead United|Orchard Park
Halthorpe Town|Foundry Road|1300
Claycliffe FC|Claycliffe Lane|2000
Crowwood Albion|Orchard Arena|1000
Bramford Olympic|Bramford Park
Ludcott Olympic|Abbey Park|2000
Ludbridge Rovers|Meadow Field
Dunminster Rovers|Dunminster Ground|2000
Hawkbury Town|Willow Lane
Granstead Borough|Common Park|2000
Henmore Wanderers|Castle Park
Millworth FC|Millworth Ground
Elmfield Borough|Elmfield Park|3000`,
  },
  {
    key: 'UCPN', div: 9, name: 'Shires League Premier North', short: 'Shires Premier North', lat: 52.9, lon: -0.8, feeds: 'NPLM',
    clubs: `Bixcott Town|Common Road
Wrenholt Colliery|Canal Park
Goldholt Victoria|Harbour Meadow
Quarford FC|Mill Park|1000
Ockhurst Town|Ockhurst Ground|6000
Aldham Albion|Station Arena
Calthorpe Rovers|Market Stadium|2000
Ormfield Town|Foundry Field
Kingswell Celtic|Market Stadium|7500
Quenthorpe Victoria|Quenthorpe Park|2400
Cogford Harriers|Hillside Road
Tetthorpe Borough|Victoria Stadium|2700
AFC Ormton|Quarry Stadium|4000
Pellmouth Athletic|Church Arena
Saxmere Swifts|Saxmere Lane
Tetmouth Town|Tetmouth Arena
Saltstow FC|Market Meadow
Drayford Town|Drayford Road|1000
Crangate Rangers|Canal Arena
Dalsfield Rovers|Beacon Road|1118`,
  },
  {
    key: 'UCPS', div: 9, name: 'Shires League Premier South', short: 'Shires Premier South', lat: 52.3, lon: -0.6, feeds: 'SL1C',
    clubs: `Wrenbury Swifts|Harbour Road
Faircombe Rovers|Market Road|1128
Ilkbridge Dynamos|Kingsway Lane|2500
Heathhurst Albion|Heathhurst Road|4000
Edenholt Town|Harbour Lane|1855
Ockton Town|Heath Arena
Clayborough Sports|Bridge Meadow
Falwick Celtic|Falwick Ground|3000
Moorwell FC|Castle Road
Edenminster Borough|Riverside Field|2500
Sandminster Rovers|Sandminster Field|4300
Quarwick FC|Orchard Road
AFC Oakstead|Foundry Arena
AFC Norhurst|Abbey Park
AFC Yarcliffe|Foundry Road
Calworth Borough|Calworth Park|2000
Ilkby Athletic|Abbey Meadow
Moorstow Victoria|Moorstow Road
Greyham Town|Canal Field|4614
Saltcombe Corinthians|Heath Park|1000`,
  },
  {
    key: 'ECP', div: 9, name: 'Fenland League Premier', short: 'Fenland Premier', lat: 52.4, lon: 1.0, feeds: 'ISTN',
    clubs: `AFC Rookwood|Chapel Arena
Claybridge Athletic|Castle Lane|3000
Pikedale Victoria|Pikedale Lane|1500
Goldbrook FC|Hillside Arena|2000
Kesford Victoria|Mill Field|3600
Larkton FC|Canal Meadow|3000
Gilmouth City|Abbey Park
Henwood Albion|Meadow Meadow|3000
Dreymore Olympic|Castle Park
Calbridge Celtic|Oak Stadium|550
Kingsbridge Town|Canal Road|2000
Normore Rovers|Bridge Meadow
Cherdale Athletic|Abbey Road
Fairthorpe Town|Chapel Road|2000
Foxton Victoria|Foxton Ground|1000
AFC Hartham|Bridge Field|1500
Marlton Albion|Marlton Stadium|1000
Ravenhurst Town|Ravenhurst Park|3000`,
  },
  {
    key: 'ESL', div: 9, name: 'Estuary League Premier', short: 'Estuary Premier', lat: 51.6, lon: 0.4, feeds: 'ISTN',
    clubs: `Stoneford Harriers|Stoneford Road|800
Glenstead United|Willow Lane|2500
Loxcombe United|Loxcombe Stadium|3000
Kesstead Athletic|Beacon Road|4100
Bramstow Athletic|Bramstow Ground|1500
Mabton Town|Kingsway Road|500
Claybrook Rovers|Claybrook Stadium|2500
Gilcliffe Colliery|Gilcliffe Ground|2500
Henstow Olympic|Church Field|3500
Thornmere Harriers|Thornmere Arena|3000
Moorby Athletic|Moorby Park|1500
Evermore United|Abbey Arena|3500
Kirkcott Victoria|Chapel Road|1000
Draywick Town|Draywick Arena|2500
Wengate Town|Riverside Arena|3000
Fairby United|Bridge Field|3000
Ickton Rovers|Heath Field|3000
Moorwick Olympic|Moorwick Field|3500
Goldstead FC|Church Meadow|2500
Essford Colliery|Elm Stadium|3000`,
  },
  {
    key: 'SSMP', div: 9, name: 'Chiltern League Premier', short: 'Chiltern Premier', lat: 51.8, lon: -0.5, feeds: 'SL1C',
    clubs: `Hencliffe City|Mill Arena|3152
Foxworth Borough|Foxworth Stadium|2920
Loxminster Victoria|Loxminster Stadium
Goldborough Harriers|Beacon Stadium
Ockwick Town|Bridge Field|2000
Millmore United|Millmore Field|1000
Dunley Athletic|Castle Park
Chalstow Dynamos|Chalstow Meadow|4000
Nutminster Swifts|Willow Ground|3065
Tadbridge FC|Brook Arena|2500
Fairbridge Wanderers|Oak Arena|3500
Brackstow Rovers|Willow Park
Ulbridge City|Market Stadium|2000
Brackdale Corinthians|Canal Lane|1963
Haggate FC|Brook Arena
Tambury Town|Tambury Lane|1500
Tadmouth Victoria|Tadmouth Meadow|2500
Brackminster Dynamos|Heath Stadium
Wenford Borough|Common Meadow|2000
Uxworth City|Uxworth Arena|500`,
  },
  {
    key: 'HLP', div: 9, name: 'Cotswold League Premier', short: 'Cotswold Premier', lat: 51.8, lon: -1.6, feeds: 'SL1S',
    clubs: `Claybury Athletic|Beacon Park|3500
Keswick Celtic|Keswick Road|4500
Fernworth Sports|Fernworth Lane|1000
Elmborough Corinthians|Brook Lane|1200
Elmthorpe Sports|Castle Ground|2000
AFC Lunthorpe|Lunthorpe Park|2000
Marlworth Sports|Brook Park|2000
Belmere Celtic|Castle Road|2000
Crowholt Rovers|Crowholt Park|2000
Saxton Wanderers|Bridge Arena|500
Cranford Sports|Meadow Arena|700
Norstow Villa|Bridge Stadium|2500
Kelstow Swifts|Kelstow Arena|4000
Kingsford United|Orchard Arena|2000
Scarcombe Celtic|Elm Lane|2000
Shelthorpe United|Foundry Lane|1500
Cranmouth Athletic|Canal Road|1000
Chergate Dynamos|Chergate Arena|1000
Chermere FC|Station Park|2000
Otthurst United|Station Field|1000`,
  },
  {
    key: 'CCPN', div: 9, name: 'Downs League Premier North', short: 'Downs Premier North', lat: 51.5, lon: -0.5, feeds: 'ISTSC',
    clubs: `Loxthorpe City|Loxthorpe Park|2000
Calminster Olympic|Heath Park|1500
Gilminster Victoria|Gilminster Ground|1000
Ravenwood Sports|Riverside Road|2550
Hawkholt Albion|Chapel Park|2000
Stanmouth Celtic|Stanmouth Road|1000
Langmere Town|Beacon Lane|2500
Saxthorpe Harriers|Bridge Meadow|1990
Calton Albion|Calton Meadow|1200
Ashhurst Rovers|Abbey Road|1990
Rookmouth Athletic|Station Lane|1000
Cranstead Dynamos|Station Stadium|1500
Saxmouth Rovers|Canal Stadium|1000
Fenby Swifts|Brook Stadium|2000
Morcombe Colliery|Chapel Park|2000
Ramsbridge Swifts|Meadow Stadium|2000
Kingsfield Sports|Common Road|2000
Ottstead Wanderers|Ottstead Stadium|1500
Lindwell Swifts|Church Park|4500
Ivyham City|Victoria Stadium|1000`,
  },
  {
    key: 'CCPS', div: 9, name: 'Downs League Premier South', short: 'Downs Premier South', lat: 51.2, lon: -0.4, feeds: 'ISTSC',
    clubs: `Wexby Town|Riverside Lane|1000
Carrmouth Swifts|Hillside Arena|2000
Ivybury Colliery|Ivybury Park|1200
Kirkwell Olympic|Oak Field|3500
Dalsbridge FC|Foundry Ground|1976
Kingsby Rovers|Kingsby Park|2000
Larkthorpe Sports|Larkthorpe Park|2000
Kingsham Town|Oak Road|2700
Wybridge Town|Wybridge Lane|2000
Chalwick Athletic|Chalwick Meadow|1000
Scarcliffe Colliery|Scarcliffe Park|2000
Sandstead Corinthians|Sandstead Meadow|1320
Wymore Colliery|Beacon Road|1800
Foxmore Albion|Heath Meadow|1000
Selhurst United|Heath Park|2000
Tamley FC|Tamley Field|600
Hagcliffe Wanderers|Brook Arena|5000
Aldbridge Athletic|Chapel Road|1000
Glenmore Celtic|Glenmore Ground|1500
Dundale Athletic|Dundale Stadium|3500`,
  },
  {
    key: 'SCFP', div: 9, name: 'South Coast League Premier', short: 'South Coast Premier', lat: 50.9, lon: -0.3, feeds: 'ISTSE',
    clubs: `Goldfield City|Goldfield Meadow|8850
Crowham Victoria|Riverside Arena|1000
AFC Tadcott|Castle Stadium|1000
Greyfield Borough|Castle Park|1200
Wexbury Sports|Wexbury Arena|1500
Ludton Rangers|Ludton Road|5000
Stonewell Wanderers|Bridge Park|2000
Hollinminster Corinthians|Hillside Ground|1575
Quarborough City|Oak Lane|1500
Quargate Athletic|Quargate Lane|2000
Pikecombe Albion|Quarry Road|1200
Larkley Dynamos|Foundry Lane|1000
Verholt Swifts|Chapel Park|3000
Shelgate Rangers|Shelgate Road|1500
Norcliffe Athletic|Norcliffe Lane|3000
Hawkwick Villa|Bridge Lane|1000
Esscliffe Albion|Willow Arena
AFC Glenford|Abbey Field|2000
Cherwell Harriers|Cherwell Park|2000
Mabcott Sports|Mabcott Arena|2000`,
  },
  {
    key: 'SCEP', div: 9, name: 'Weald League Premier', short: 'Weald Premier', lat: 51.3, lon: 0.6, feeds: 'ISTSE',
    clubs: `Brackmouth Harriers|Oak Stadium|1000
Uxcliffe Sports|Willow Park|1200
Pikefield Victoria|Quarry Ground|2000
Haldale Harriers|Abbey Ground|4000
Selwell Swifts|Selwell Stadium|3000
Netherworth Rangers|Brook Park|2500
Ilkworth Sports|Hillside Park|1000
Kelbrook Colliery|Common Lane
Pikeford United|Pikeford Park|3000
Morholt Town|Morholt Road|3200
Dreywell Town|Dreywell Field|3000
Scarwood Olympic|Willow Lane|2000
Evergate Rovers|Elm Lane|600
Calstow Athletic|Chapel Ground|1500
Kingscliffe United|Kingscliffe Park|1000
Dreydale Town|Bridge Lane|1550
Ludmouth United|Foundry Stadium
AFC Ockmouth|Heath Road|3750
Ashholt Athletic|Ashholt Arena|3000`,
  },
  {
    key: 'WXP', div: 9, name: 'Solent League Premier', short: 'Solent Premier', lat: 50.9, lon: -1.5, feeds: 'SL1S',
    clubs: `AFC Tetmere|Tetmere Stadium|1000
Fenhurst United|Castle Park|1000
Penworth Swifts|Quarry Park
Crowmere Corinthians|Crowmere Lane|2100
Ludwell Borough|Ludwell Road|3000
Dreycott Swifts|Beacon Arena|2000
Mabhurst Albion|Bridge Ground|2000
Wenholt Town|Wenholt Field|2000
Netherstead Town|Netherstead Stadium|2000
Falwell Borough|Falwell Road|1000
Woldton Harriers|Foundry Park
Ludstow Villa|Ludstow Lane|1500
Ramsmore Borough|Ramsmore Park|1000
Cranbridge FC|Elm Ground
Quenford United|Harbour Lane|1000
Lindcott Olympic|Lindcott Road|3000
Dunstead FC|Willow Lane|3000
Hollincott Athletic|Hollincott Ground|2000
AFC Rushholt|Rushholt Park|1150
Hartbury Albion|Foundry Meadow|1000`,
  },
  {
    key: 'WEP', div: 9, name: 'Severn League Premier', short: 'Severn Premier', lat: 51.2, lon: -2.9, feeds: 'SL1S',
    clubs: `Gilwick United|Willow Arena|5000
Hawkworth Athletic|Hawkworth Arena|1000
AFC Saltley|Canal Road|2500
Kirkton Harriers|Castle Arena|3000
AFC Yarley|Yarley Park|1000
Nethercombe Victoria|Mill Stadium|3900
Hollmouth Sports|Hillside Arena|1300
Walcombe Swifts|Brook Road|2000
Loxton Athletic|Foundry Road|5000
Larkford Sports|Bridge Meadow|1000
Crowfield Swifts|Bridge Park|2500
AFC Ridbury|Elm Park|1000
Penthorpe Rangers|Penthorpe Road|2500
Gilwood Victoria|Riverside Road|2500
Ivymore Sports|Castle Field|3500
Calham United|Common Road|1000
Woldcliffe Town|Willow Road|1000
Burdale Town|Church Meadow|1000`,
  },
  // ---------------- Step 6 (div 10)
  {
    key: 'NL2', div: 10, name: 'Tyne & Tees League Division One', short: 'Tyne & Tees D1', lat: 54.7, lon: -1.6, feeds: 'NL1',
    clubs: `Uxgate Sports|Uxgate Stadium
Ludford City|Common Stadium|2500
Pellfield Harriers|Pellfield Road|2000
Thorncott Rovers|Thorncott Road|3000
Ashstead FC|Riverside Park
Ashwell Victoria|Ashwell Road
Claywell Town|Canal Ground
Goldthorpe Colliery|Goldthorpe Field
Netherstow Corinthians|Netherstow Field|3500
Dunworth Colliery|Dunworth Park
Clayham Dynamos|Clayham Road
Greyhurst Harriers|Market Park
AFC Foxborough|Beacon Road
Kelbridge Town|Station Ground
Quarbrook Victoria|Beacon Stadium
Morcliffe FC|Morcliffe Lane
Dalscombe Sports|Dalscombe Field|1500
Walbrook Borough|Walbrook Park
Evermere Swifts|Evermere Meadow|1500
Kesholt Town|Kingsway Road
Mabcombe Sports|Mill Arena|3000
Dreybridge Albion|Canal Park|3000`,
  },
  {
    key: 'NCE1', div: 10, name: 'Ridings League Division One', short: 'Ridings D1', lat: 53.6, lon: -1.3, feeds: 'NCEP',
    clubs: `Saltstead Borough|Market Stadium|1100
Claymouth Dynamos|Willow Lane|2500
Fenwick Villa|Mill Stadium|2000
Hollcott Corinthians|Hollcott Meadow|2500
Rushborough Olympic|Kingsway Meadow|1200
Millmere Wanderers|Heath Road|500
Yarcott Sports|Market Ground|1000
Stanminster Villa|Brook Field|2500
Hartstow Rangers|Hartstow Park|2000
Shelbrook Rangers|Foundry Road|3000
Dreywick FC|Kingsway Arena|3500
Ickdale Victoria|Brook Road|700
Carrby Athletic|Church Meadow|1500
Wenham Rovers|Wenham Meadow|500
Sandley Olympic|Brook Stadium|2000
Crandale Rovers|Crandale Park|1500
Saltcliffe FC|Abbey Road|500
Vercliffe Colliery|Vercliffe Ground|5000
Nutbrook City|Orchard Park|3450
Cogminster Sports|Castle Field|6954
Uxley Town|Station Meadow|3000
Hollton Harriers|Hollton Ground|2000`,
  },
  {
    key: 'NWC1N', div: 10, name: 'Mersey Valley League Division One North', short: 'Mersey Valley D1 North', lat: 53.8, lon: -2.6, feeds: 'NWCP',
    clubs: `Ravenwick Athletic|Brook Park
Bixworth Athletic|Quarry Meadow
Ramsstow Town|Meadow Field
Tetford Corinthians|Tetford Park
Fernford Swifts|Elm Road
Calcombe Villa|Calcombe Stadium
Wenmere Villa|Canal Road
Pikewell Athletic|Pikewell Meadow
Ravenminster Dynamos|Mill Ground
Hagley FC|Market Road
Tamthorpe Villa|Harbour Meadow
Thornby Celtic|Thornby Road
Goldbridge FC|Quarry Arena
Falstead Town|Kingsway Arena
Ramsford Victoria|Ramsford Lane
Dunby Rovers|Beacon Ground
Brookwell City|Hillside Road
Yarbury Athletic|Quarry Field`,
  },
  {
    key: 'NWC1S', div: 10, name: 'Mersey Valley League Division One South', short: 'Mersey Valley D1 South', lat: 53.3, lon: -2.5, feeds: 'NWCP',
    clubs: `Walworth Borough|Abbey Road
Stonemouth Town|Common Road
Kelborough Dynamos|Mill Park
Foxcliffe City|Oak Lane
Stanby Swifts|Chapel Lane
Hartbrook Borough|Kingsway Stadium
Ockstow Celtic|Ockstow Lane
Burcombe Athletic|Willow Ground
Elmham Harriers|Hillside Ground
Ilkdale United|Ilkdale Arena
Quenfield FC|Quenfield Field
Edenworth Colliery|Church Arena
Tadcliffe Borough|Tadcliffe Meadow
Verton FC|Common Field
Stonecliffe Celtic|Canal Park
Kelstead Swifts|Kelstead Stadium
Heathholt Colliery|Castle Road
Calmouth Town|Calmouth Lane`,
  },
  {
    key: 'ML1', div: 10, name: 'Heartland League Division One', short: 'Heartland D1', lat: 52.5, lon: -1.8, feeds: 'MLP',
    clubs: `Aldcliffe Town|Aldcliffe Park
Wythorpe Dynamos|Abbey Road
Foxbrook Swifts|Common Field|4000
Bixford Wanderers|Bixford Road
Padmore Celtic|Padmore Lane
Lunham Corinthians|Mill Field|2000
Saltminster FC|Castle Park
Kesmore Athletic|Victoria Field|1500
Tadbrook Victoria|Tadbrook Ground|2050
Coldcliffe Celtic|Oak Stadium|2050
Cherley Villa|Kingsway Arena|3000
Quarmouth FC|Quarmouth Park
Kelbury Wanderers|Church Park|1000
Fenham Town|Fenham Field
Aldwell Borough|Canal Meadow|4000
Stanborough FC|Beacon Stadium
Draybury Olympic|Canal Field
Dreymere Wanderers|Elm Road|2500
Brookmore Town|Canal Stadium|1500
Halmore Sports|Halmore Road
Ottworth Town|Ottworth Park`,
  },
  {
    key: 'UC1', div: 10, name: 'Shires League Division One', short: 'Shires D1', lat: 52.6, lon: -0.6, feeds: 'UCPN',
    clubs: `AFC Oakthorpe|Foundry Lane
Netherwick Borough|Harbour Ground
Stanmore Athletic|Abbey Park
Essham Athletic|Beacon Road|500
Ludstead Wanderers|Ludstead Field
Hollthorpe Albion|Elm Stadium
Brackby Sports|Brackby Road
Elmley Harriers|Elmley Meadow|1000
Ivycliffe Sports|Common Lane|2700
Essby Victoria|Essby Road
Belfield Town|Foundry Arena
Ashham United|Orchard Lane
Essbridge FC|Castle Meadow|1000
Carrstow Corinthians|Carrstow Field|2000
Padwood Rovers|Padwood Park
Woldham Harriers|Victoria Stadium|2000
Morborough Villa|Morborough Stadium|1000
Hendale Corinthians|Hendale Road|3000
Millstow Rovers|Millstow Road
AFC Oakstow|Oakstow Lane
Ulcott Rangers|Quarry Field|5000
Mabholt Villa|Mabholt Arena|500
Pellwick United|Harbour Meadow`,
  },
  {
    key: 'EC1N', div: 10, name: 'Fenland League Division One North', short: 'Fenland D1 North', lat: 52.6, lon: 1.1, feeds: 'ECP',
    clubs: `Kirkworth Town|Kirkworth Park|2500
Everborough Celtic|Everborough Stadium|2500
Uxholt Town|Beacon Meadow|1000
Saxminster Borough|Canal Road|3000
Uxstead FC|Uxstead Road
Moorcott Rangers|Elm Field
Elmwick Town|Market Lane
Sandmere Town|Sandmere Road|1000
Penborough Town|Abbey Field
Saltford Athletic|Saltford Field|3000
Heathley Town|Heathley Meadow|4000
Langton Villa|Heath Meadow
Ridstow Athletic|Kingsway Arena
Chalbridge Celtic|Chalbridge Park|2500
Sandmouth Harriers|Beacon Road
Sheldale Athletic|Foundry Park|4000
Verhurst City|Verhurst Lane|2000
Henmere Rovers|Brook Road
Thornstow Wanderers|Thornstow Lane|2876
Rookwell Town|Oak Road|2500`,
  },
  {
    key: 'EC1S', div: 10, name: 'Fenland League Division One South', short: 'Fenland D1 South', lat: 51.9, lon: 0.8, feeds: 'ESL',
    clubs: `Ickmere Victoria|Foundry Ground|5000
Kirkwood Swifts|Kirkwood Lane|3500
Ridhurst City|Ridhurst Ground|2000
Fenfield FC|Common Road|500
Dungate Athletic|Dungate Park|2000
Edenstow Wanderers|Edenstow Lane|3500
Lindby United|Lindby Ground|2000
Millham Rovers|Market Park|2000
Cogby Town|Beacon Stadium|3000
Penbury Rovers|Penbury Road|1500
Ormley Harriers|Station Meadow|3300
Ridley Wanderers|Ridley Meadow|3000
Stonewood Harriers|Stonewood Park|3000
Netherminster United|Netherminster Ground|3500
AFC Keswood|Keswood Lane|3000
Stonestead Athletic|Castle Park|1500
Tetbridge Swifts|Church Ground|3000
AFC Gilborough|Gilborough Ground|2500
Falley Celtic|Falley Park|3300
Wrenminster Sports|Elm Park|2000
Thornborough Athletic|Thornborough Park|2000`,
  },
  {
    key: 'SSM1', div: 10, name: 'Chiltern League Division One', short: 'Chiltern D1', lat: 51.9, lon: -0.4, feeds: 'SSMP',
    clubs: `Luncombe Rovers|Foundry Park|1300
Netherborough Rovers|Kingsway Meadow|1000
Ottwood Celtic|Victoria Lane
Penholt Rovers|Penholt Stadium
Burholt Rovers|Burholt Meadow|1000
Whitbridge Olympic|Quarry Road
Morstead Borough|Foundry Lane
Dunfield Rovers|Dunfield Meadow
Mormore United|Hillside Stadium|1800
Moorford Rovers|Brook Arena|2800
Burbury Albion|Burbury Road|2800
Carrley FC|Victoria Lane
Rushmouth City|Rushmouth Meadow|1000
Hollstow Colliery|Mill Ground|1000
Fernhurst Dynamos|Fernhurst Park|1000
Nutmouth Sports|Market Park
Stancott FC|Orchard Ground|5000
Rookcliffe Town|Elm Lane|1500
Falholt FC|Falholt Road|1000
Wexham Albion|Meadow Road|1500
Sandbury Wanderers|Elm Park|2140`,
  },
  {
    key: 'HL1', div: 10, name: 'Cotswold League Division One', short: 'Cotswold D1', lat: 51.8, lon: -1.5, feeds: 'HLP',
    clubs: `Tamminster FC|Tamminster Ground
Brookbridge Albion|Willow Road|1000
Draybridge Olympic|Canal Meadow|1000
Granmore Borough|Granmore Lane|1500
AFC Stonewick|Stonewick Stadium|1000
Ivyhurst Wanderers|Ivyhurst Park|1000
Oakcombe Sports|Foundry Road|2000
Langmore Celtic|Langmore Ground|3000
Coldmere Swifts|Chapel Stadium|1000
Sandgate FC|Sandgate Field|1000
Kesworth United|Bridge Field|1000
Tetwood Albion|Meadow Road|3000
Heathton Rovers|Bridge Park|2000
AFC Dunham|Brook Park|3000
Tadbury Swifts|Tadbury Road|2000
Hawkcombe Wanderers|Hawkcombe Road|1500
Carrbury Corinthians|Church Park
Padbury Villa|Padbury Park|3000`,
  },
  {
    key: 'CC1', div: 10, name: 'Downs League Division One', short: 'Downs D1', lat: 51.3, lon: -0.4, feeds: 'CCPN',
    clubs: `Tadfield Colliery|Tadfield Field|1200
Hollinmouth Harriers|Castle Road|1150
Burford United|Foundry Meadow|2000
Greymere Town|Greymere Lane|1500
Wydale Albion|Wydale Ground|2000
Greycombe City|Bridge Meadow|3000
Cogfield Dynamos|Cogfield Arena|3587
Elmworth Swifts|Riverside Arena
Kingswick Rovers|Riverside Ground|2000
Clayminster FC|Church Arena|1000
Kelwood United|Castle Park|4000
Ickminster Town|Church Stadium|2000
Yarwood Sports|Foundry Arena|900
Nutmore Town|Nutmore Lane|2550
Saxstow Victoria|Saxstow Ground|3075
Colddale Villa|Riverside Lane|1950
Ravenby Rovers|Beacon Arena|1200
Ridmere Colliery|Ridmere Arena|1000
Crowby United|Foundry Park|1500
Coghurst Dynamos|Oak Park|1000
Padhurst Borough|Padhurst Lane|2450
Vermouth Celtic|Foundry Field|2000
Linddale Swifts|Bridge Park|2000`,
  },
  {
    key: 'SCF1', div: 10, name: 'South Coast League Division One', short: 'South Coast D1', lat: 50.9, lon: -0.2, feeds: 'SCFP',
    clubs: `Ivymere Rangers|Canal Road|600
Selminster United|Brook Park
Cherfield Rovers|Cherfield Lane|2200
Ormford Villa|Market Ground
Greygate City|Greygate Ground|1300
Brackworth City|Brackworth Road|3000
Lunby Borough|Lunby Arena|1000
Shelby United|Castle Stadium|3000
Stangate Colliery|Victoria Lane
Ulmore Athletic|Church Park
Kirkminster Town|Kirkminster Ground|1000
Rushthorpe Sports|Common Park
Yarhurst Celtic|Yarhurst Lane
Foxley Celtic|Heath Park
Everbridge Athletic|Market Road
AFC Aldcombe|Orchard Road|1000
AFC Ickfield|Willow Field
Foxcombe Rovers|Quarry Park|1504`,
  },
  {
    key: 'SCE1', div: 10, name: 'Weald League Division One', short: 'Weald D1', lat: 51.3, lon: 0.5, feeds: 'SCEP',
    clubs: `Verdale Colliery|Bridge Meadow
Whitfield Harriers|Castle Park|1500
Carrmere Olympic|Beacon Park
Falfield FC|Falfield Road|3000
Lindholt Wanderers|Quarry Meadow|8000
Ormbridge City|Chapel Field
AFC Rookholt|Elm Arena|1000
Lindborough Borough|Elm Arena|4100
Hawkthorpe Swifts|Abbey Ground
Whitton United|Hillside Road|600
Ottby Borough|Quarry Road|1000
Netherbridge Rovers|Orchard Park|1000
Crowley Olympic|Crowley Meadow|5000
Hollholt Borough|Hollholt Stadium|1530
Granmouth Albion|Brook Arena|800
Padgate Olympic|Beacon Arena|1000
Halmere Rovers|Quarry Road|2000
Ramsbury FC|Orchard Meadow`,
  },
  {
    key: 'WX1', div: 10, name: 'Solent League Division One', short: 'Solent D1', lat: 50.9, lon: -1.4, feeds: 'WXP',
    clubs: `Langfield City|Brook Road|1500
AFC Aldstow|Foundry Ground|1000
Ormham Wanderers|Ormham Park|1000
Tadthorpe Sports|Tadthorpe Park|2500
Selbrook City|Oak Park|2500
Quenholt Dynamos|Orchard Ground|5300
Wybury Swifts|Wybury Lane|4500
Verfield Borough|Orchard Arena
Hollhurst FC|Hollhurst Road|1000
Edenwell Olympic|Edenwell Arena|1000
Oakwell Olympic|Oakwell Road|1000
Ridwick Swifts|Canal Road|2000
Tammere Olympic|Kingsway Lane|1000
Padworth Town|Station Lane
Netherholt Dynamos|Station Arena|1000
Quenborough Sports|Quenborough Road|1000
Ickbrook Victoria|Ickbrook Stadium|1000
Granhurst United|Granhurst Arena
AFC Aldholt|Aldholt Stadium|1500
Pikebrook Swifts|Riverside Ground|1000
Halmouth Dynamos|Halmouth Park|1000
Grandale Sports|Orchard Park|500`,
  },
  {
    key: 'WE1', div: 10, name: 'Severn League Division One', short: 'Severn D1', lat: 51.3, lon: -2.6, feeds: 'WEP',
    clubs: `Belcliffe Celtic|Belcliffe Park|1000
Rookgate Rovers|Victoria Stadium
Tetmore United|Brook Field
Rookbury Rovers|Market Park
Ludbrook Albion|Ludbrook Park|1000
Fenworth Town|Oak Road
Foxdale Town|Heath Park|2500
Ockgate Harriers|Ockgate Field
Mabdale Rovers|Church Park|2500
AFC Ramswick|Ramswick Field|1000
AFC Hawkstead|Foundry Road|3001
Mabwood Celtic|Riverside Meadow|1000
Scarwell Rovers|Common Lane|1000
Heathbury Swifts|Heathbury Arena|1000
Henwick United|Meadow Stadium|1250
Pellford Villa|Pellford Arena|1000
Claycombe Victoria|Canal Road|1000
Bramborough Borough|Orchard Stadium|1000
Ormcott FC|Ormcott Road|1500
Hagcombe Villa|Beacon Park|2400`,
  },
  {
    key: 'SWPE', div: 10, name: 'Peninsula League East', short: 'Peninsula East', lat: 50.6, lon: -3.6, feeds: 'WEP',
    clubs: `Cogmore Rangers|Quarry Field|2000
Saltthorpe Villa|Beacon Field|1000
Crowstead Wanderers|Crowstead Field|1000
Hencombe Borough|Station Stadium|2000
Sandwood Victoria|Sandwood Arena|2000
Lindbury Victoria|Lindbury Park|3572
Saltby Rovers|Harbour Stadium|2000
Brookham United|Abbey Road|1000
Edenborough Rovers|Canal Road|2000
Clayby Sports|Orchard Arena|1000
Lindwick Victoria|Lindwick Road|1100
Halhurst Wanderers|Halhurst Meadow
Woldborough Athletic|Heath Park|2000
Fenwell Villa|Fenwell Lane|1500
Ockworth Swifts|Oak Road|1000`,
  },
  {
    key: 'SWPW', div: 10, name: 'Peninsula League West', short: 'Peninsula West', lat: 50.3, lon: -4.9, feeds: 'WEP',
    clubs: `Heathmere Athletic|Heath Park|3000
Rushmore Harriers|Rushmore Road|1000
Gildale Victoria|Kingsway Road|3000
Hollfield United|Orchard Lane|2000
Pellbury Villa|Pellbury Road|3000
Kingshurst Olympic|Kingshurst Stadium|1000
Goldbury Wanderers|Goldbury Meadow|800
AFC Glenthorpe|Mill Field|2000
Moorwood Albion|Common Field
Nutborough Corinthians|Common Road|1000
Whitmere Victoria|Kingsway Arena|3000
Ulminster Celtic|Bridge Stadium|2500
Henborough Celtic|Henborough Ground|1000
Quarcliffe Town|Bridge Field|2000
Brackford Colliery|Brackford Road|1000
Bramcombe Rangers|Hillside Road|500`,
  },
];

/** Division OVR bands (DESIGN.md 4.4): average starter OVR per division. */
export const DIV_AVG_OVR = [0, 80, 72, 66, 61, 56, 52, 48, 44, 40, 36];
