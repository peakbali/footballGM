/**
 * English pyramid 2025/26, divisions 1-10 (Premier League = div 1 ... FA Step 6 = div 10).
 * Each club line is "Name" or "Name|Stadium|Capacity". Membership for all divisions is from the
 * 2025/26 Wikipedia season pages (clubs that resigned before the season are left out); it can be
 * corrected by editing this file (one club per line in each `clubs` block).
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
    key: 'PL', div: 1, name: 'Premier League', short: 'Premier', lat: 52.5, lon: -1.5,
    clubs: `Arsenal|Emirates Stadium|60704
Aston Villa|Villa Park|42640
AFC Bournemouth|Vitality Stadium|11307
Brentford|Gtech Community Stadium|17250
Brighton & Hove Albion|Amex Stadium|31876
Burnley|Turf Moor|21944
Chelsea|Stamford Bridge|40343
Crystal Palace|Selhurst Park|25486
Everton|Hill Dickinson Stadium|52888
Fulham|Craven Cottage|29589
Leeds United|Elland Road|37645
Liverpool|Anfield|61276
Manchester City|Etihad Stadium|55017
Manchester United|Old Trafford|74197
Newcastle United|St James' Park|52305
Nottingham Forest|City Ground|30404
Sunderland|Stadium of Light|49000
Tottenham Hotspur|Tottenham Hotspur Stadium|62850
West Ham United|London Stadium|62500
Wolverhampton Wanderers|Molineux|31750`,
  },
  {
    key: 'CH', div: 2, name: 'Championship', short: 'Championship', lat: 52.5, lon: -1.5,
    clubs: `Birmingham City|St Andrew's|29409
Blackburn Rovers|Ewood Park|31367
Bristol City|Ashton Gate|27000
Charlton Athletic|The Valley|27111
Coventry City|Coventry Building Society Arena|32609
Derby County|Pride Park|32956
Hull City|MKM Stadium|25586
Ipswich Town|Portman Road|30056
Leicester City|King Power Stadium|32259
Middlesbrough|Riverside Stadium|34742
Millwall|The Den|20146
Norwich City|Carrow Road|27359
Oxford United|Kassam Stadium|12500
Portsmouth|Fratton Park|20867
Preston North End|Deepdale|23404
Queens Park Rangers|Loftus Road|18439
Sheffield United|Bramall Lane|32050
Sheffield Wednesday|Hillsborough|39732
Southampton|St Mary's Stadium|32384
Stoke City|bet365 Stadium|30089
Swansea City|Swansea.com Stadium|21088
Watford|Vicarage Road|22200
West Bromwich Albion|The Hawthorns|26688
Wrexham|Racecourse Ground|12600`,
  },
  {
    key: 'L1', div: 3, name: 'League One', short: 'League One', lat: 52.5, lon: -1.5,
    clubs: `AFC Wimbledon|Plough Lane|9215
Barnsley|Oakwell|23287
Blackpool|Bloomfield Road|16616
Bolton Wanderers|Toughsheet Community Stadium|28723
Bradford City|Valley Parade|25136
Burton Albion|Pirelli Stadium|6912
Cardiff City|Cardiff City Stadium|33280
Doncaster Rovers|Eco-Power Stadium|15231
Exeter City|St James Park|8714
Huddersfield Town|John Smith's Stadium|24121
Leyton Orient|Brisbane Road|9271
Lincoln City|LNER Stadium|10669
Luton Town|Kenilworth Road|12000
Mansfield Town|Field Mill|9186
Northampton Town|Sixfields Stadium|7798
Peterborough United|London Road|15314
Plymouth Argyle|Home Park|17900
Port Vale|Vale Park|15036
Reading|Select Car Leasing Stadium|24161
Rotherham United|New York Stadium|12021
Stevenage|Broadhall Way|7800
Stockport County|Edgeley Park|10852
Wigan Athletic|Brick Community Stadium|25138
Wycombe Wanderers|Adams Park|9448`,
  },
  {
    key: 'L2', div: 4, name: 'League Two', short: 'League Two', lat: 52.5, lon: -1.5,
    clubs: `Accrington Stanley|Crown Ground|5450
Barnet|The Hive|6500
Barrow|Holker Street|5045
Bristol Rovers|Memorial Stadium|9832
Bromley|Hayes Lane|5300
Cambridge United|Abbey Stadium|8127
Cheltenham Town|Whaddon Road|7066
Chesterfield|SMH Group Stadium|10504
Colchester United|JobServe Community Stadium|10105
Crawley Town|Broadfield Stadium|6134
Crewe Alexandra|Gresty Road|10153
Fleetwood Town|Highbury Stadium|5327
Gillingham|Priestfield Stadium|11582
Grimsby Town|Blundell Park|9052
Harrogate Town|Wetherby Road|5000
Milton Keynes Dons|Stadium MK|30500
Newport County|Rodney Parade|7850
Notts County|Meadow Lane|19841
Oldham Athletic|Boundary Park|13513
Salford City|Peninsula Stadium|5108
Shrewsbury Town|New Meadow|9875
Swindon Town|County Ground|15728
Tranmere Rovers|Prenton Park|16567
Walsall|Bescot Stadium|11300`,
  },
  {
    key: 'NL', div: 5, name: 'National League', short: 'National', lat: 52.5, lon: -1.5,
    clubs: `Aldershot Town|The Recreation Ground|7100
Altrincham|Moss Lane|7700
Boreham Wood|Meadow Park|4502
Boston United|Boston Community Stadium|5061
Brackley Town|St. James Park|3500
Braintree Town|Cressing Road|4222
Carlisle United|Brunton Park|17949
Eastleigh|Ten Acres|5250
FC Halifax Town|The Shay|10400
Forest Green Rovers|The New Lawn|5147
Gateshead|Gateshead International Stadium|11800
Hartlepool United|Victoria Park|7856
Morecambe|Mazuma Mobile Stadium|6476
Rochdale|Spotland Stadium|10249
Scunthorpe United|Glanford Park|9088
Solihull Moors|Damson Park|5500
Southend United|Roots Hall|12392
Sutton United|Gander Green Lane|5013
Tamworth|The Lamb Ground|4565
Truro City|Truro City Stadium|3600
Wealdstone|Grosvenor Vale|4085
Woking|Kingfield Stadium|6036
Yeovil Town|Huish Park|9566
York City|York Community Stadium|8500`,
  },
  // ---------------- Step 2 (div 6)
  {
    key: 'NLN', div: 6, name: 'National League North', short: 'NL North', lat: 53.4, lon: -2.0,
    clubs: `AFC Fylde|Mill Farm Sports Village|6000
AFC Telford United|New Bucks Head|6300
Alfreton Town|North Street|3600
Bedford Town|The Eyrie|3000
Buxton|The Silverlands|5200
Chester|Deva Stadium|5400
Chorley|Victory Park|4100
Curzon Ashton|Tameside Stadium|4000
Darlington|Blackwell Meadows|3300
Hereford|Edgar Street|5250
Kidderminster Harriers|Aggborough|6238
King's Lynn Town|The Walks|8200
Leamington|New Windmill Ground|3050
Macclesfield|Moss Rose|5300
Marine|Rossett Park|2200
Merthyr Town|Penydarren Park|4000
Oxford City|Marsh Lane|3500
Peterborough Sports|Lincoln Road|2300
Radcliffe|Stainton Park|3500
Scarborough Athletic|Scarborough Sports Village|3251
South Shields|Mariners Park|4000
Southport|Haig Avenue|6008
Spennymoor Town|The Brewery Field|4300
Worksop Town|Sandy Lane|2500`,
  },
  {
    key: 'NLS', div: 6, name: 'National League South', short: 'NL South', lat: 51.3, lon: -0.8,
    clubs: `AFC Totton|Testwood Stadium|3000
Bath City|Twerton Park|8840
Chelmsford City|Melbourne Stadium|3502
Chesham United|The Meadow|5000
Chippenham Town|Hardenhuish Park|3000
Dagenham & Redbridge|Victoria Road|6078
Dorking Wanderers|Meadowbank Stadium|4250
Dover Athletic|Crabble Athletic Ground|6500
Eastbourne Borough|Priory Lane|4151
Ebbsfleet United|Stonebridge Road|4800
Enfield Town|Queen Elizabeth II Stadium|2500
Farnborough|Cherrywood Road|7000
Hampton & Richmond Borough|Beveree Stadium|3500
Hemel Hempstead Town|Vauxhall Road|3152
Hornchurch|Hornchurch Stadium|3500
Horsham|Hop Oast Stadium|3000
Maidenhead United|York Road|4000
Maidstone United|Gallagher Stadium|4200
Salisbury|Raymond McEnhill Stadium|5000
Slough Town|Arbour Park|2000
Tonbridge Angels|Longmead Stadium|3000
Torquay United|Plainmoor|6500
Weston-super-Mare|Woodspring Stadium|3500
Worthing|Woodside Road|4000`,
  },
  // ---------------- Step 3 (div 7)
  {
    key: 'NPLP', div: 7, name: 'Northern Premier League', short: 'NPL Premier', lat: 53.6, lon: -1.9, feeds: 'NLN',
    clubs: `Ashton United|Hurst Cross|4500
Bamber Bridge|Irongate|2642
Cleethorpes Town|Clee Road|1000
FC United of Manchester|Broadhurst Park|4400
Gainsborough Trinity|The Northolme|4304
Guiseley|Nethermoor Park|4000
Hebburn Town|The Green Energy Sports Ground|1500
Hednesford Town|Keys Park|6039
Hyde United|Ewen Fields|4250
Ilkeston Town|New Manor Ground|3029
Lancaster City|The Giant Axe|3500
Leek Town|Harrison Park|3600
Morpeth Town|Craik Park|1500
Prescot Cables|IP Truck Parts Stadium|2070
Rushall Olympic|Dales Lane|1400
Stocksbridge Park Steels|Bracken Moor|3500
Stockton Town|Bishopton Road West|2200
Warrington Rylands 1906|Gorsey Lane|1345
Warrington Town|Cantilever Park|2500
Whitby Town|Turnbull Ground|3500
Workington|Borough Park|3101`,
  },
  {
    key: 'SLPC', div: 7, name: 'Southern League Premier Central', short: 'Southern Central', lat: 52.4, lon: -1.2, feeds: 'NLN',
    clubs: `AFC Sudbury|King's Marsh|2500
Alvechurch|Lye Meadow|3000
Banbury United|Spencer Stadium|3116
Barwell|Kirkby Road|2500
Bishop's Stortford|Woodside Park|4525
Bromsgrove Sporting|Victoria Ground|3500
Bury Town|Ram Meadow|3500
Halesowen Town|The Grove|3150
Harborough Town|Bowden Park|1000
Kettering Town|Latimer Park|3029
Leiston|Victory Road|2250
Needham Market|Bloomfields|4000
Quorn|Farley Way Stadium|1477
Real Bedford|McMullen Park|1500
Redditch United|The Valley|5000
Royston Town|Garden Walk|5000
Spalding United|Sir Halley Stewart Field|2700
St Ives Town|Westwood Road|2000
Stamford|Borderville Sports Centre|2000
Stourbridge|War Memorial Athletic Ground|2035
Stratford Town|Knights Lane|2000
Worcester City|Sixways Stadium|12067`,
  },
  {
    key: 'SLPS', div: 7, name: 'Southern League Premier South', short: 'Southern South', lat: 51.0, lon: -2.2, feeds: 'NLS',
    clubs: `Basingstoke Town|Winklebury Football Complex|2000
Berkhamsted|Broadwater|1950
Bracknell Town|SB Stadium|1950
Chertsey Town|Alwyns Lane|2500
Dorchester Town|The Avenue Stadium|5229
Evesham United|Jubilee Stadium|3000
Farnham Town|The Memorial Ground|1500
Gloucester City|Meadow Park|4000
Gosport Borough|Privett Park|4500
Hanwell Town|Powerday Stadium|3000
Havant & Waterlooville|Westleigh Park|5300
Hungerford Town|Bulpit Lane|2500
Plymouth Parkway|Bolitho Park|3500
Poole Town|The BlackGold Stadium|2500
Sholing|Universal Stadium|2500
Taunton Town|Wordsworth Drive|3000
Tiverton Town|Ladysmead|3500
Uxbridge|Honeycroft|3770
Walton & Hersham|Elmbridge Sports Hub|2097
Weymouth|Bob Lucas Stadium|6600
Wimborne Town|The Cuthbury|3250
Yate Town|Lodge Road|2000`,
  },
  {
    key: 'ISTP', div: 7, name: 'Isthmian League Premier', short: 'Isthmian Premier', lat: 51.4, lon: 0.3, feeds: 'NLS',
    clubs: `Aveley|Parkside|3500
Billericay Town|New Lodge|4800
Brentwood Town|The Brentwood Centre Arena|1500
Burgess Hill Town|Leylands Park|2500
Canvey Island|Park Lane|4100
Carshalton Athletic|War Memorial Sports Ground|5000
Chatham Town|The Bauvill Stadium|5000
Cheshunt|Theobalds Lane|3174
Chichester City|Oaklands Park|2000
Cray Valley Paper Mills|Badgers Sports Ground|1550
Cray Wanderers|Flamingo Park|2500
Dartford|Princes Park|4100
Dulwich Hamlet|Champion Hill|3334
Folkestone Invicta|Cheriton Road|4000
Hashtag United|Parkside|3500
Lewes|The Dripping Pan|3000
Potters Bar Town|Parkfield|2000
Ramsgate|Southwood Stadium|3500
St Albans City|Clarence Park|5007
Welling United|Park View Road|4000
Whitehawk|The Enclosed Ground|3126
Wingate & Finchley|The Maurice Rebak Stadium|2638`,
  },
  // ---------------- Step 4 (div 8)
  {
    key: 'NPLE', div: 8, name: 'Northern Premier League East', short: 'NPL East', lat: 54.0, lon: -1.3, feeds: 'NPLP',
    clubs: `Ashington|Woodhorn Lane|2000
Bishop Auckland|Heritage Park|1950
Blyth Spartans|Croft Park|4435
Blyth Town|South Newsham Playing Fields|1000
Bradford (Park Avenue)|Horsfall Stadium|3500
Bridlington Town|Queensgate|3000
Brighouse Town|St Giles Road|1000
Consett|Belle View Stadium|3770
Dunston|Wellington Road|2500
Emley|Welfare Ground|2000
Garforth Town|Wheatley Park|3000
Grimsby Borough|Bradley Football Centre|1250
Hallam|Sandygate|1665
Heaton Stannington|The Willow Park|2000
Lincoln United|Ashby Avenue|2714
Matlock Town|Causeway Lane|2400
Newton Aycliffe|Moore Lane|1000
North Ferriby|The Dransfield Stadium|3000
Ossett United|Ingfield|3280
Pontefract Collieries|Harratt Nissan Stadium|1200
Redcar Athletic|Green Lane|1000
Silsden|Keighley Road Stadium|1500`,
  },
  {
    key: 'NPLW', div: 8, name: 'Northern Premier League West', short: 'NPL West', lat: 53.6, lon: -2.7, feeds: 'NPLP',
    clubs: `Atherton Collieries|Alder Street|2500
Avro|Whitebank Stadium|1500
Bootle|New Bucks Park|2500
Bury|Gigg Lane|12500
Chasetown|The Scholars Ground|3000
Clitheroe|Shawbridge|2000
Congleton Town|Cleric Stadium|1500
Darlaston Town 1874|The Paycare Ground|1000
Kidsgrove Athletic|Clough Hall|2000
Lower Breck|Anfield Sports and Community Centre|1000
Mossley|Seel Park|4000
Nantwich Town|The Weaver Stadium|3500
Newcastle Town|Lyme Valley Stadium|4000
Runcorn Linnets|APEC Taxis Stadium|1600
Shifnal Town|Acoustafoam Stadium|1500
Sporting Khalsa|Aspray Arena|5000
Stafford Rangers|Marston Road|4150
Stalybridge Celtic|Bower Fold|6500
Trafford|Shawe View|2500
Vauxhall Motors|Rivacre Park|3300
Witton Albion|Wincham Park|4813
Wythenshawe Town|Ericstan Stadium|1320`,
  },
  {
    key: 'NPLM', div: 8, name: 'Northern Premier League Midlands', short: 'NPL Midlands', lat: 52.8, lon: -1.3, feeds: 'SLPC',
    clubs: `AFC Rushden & Diamonds|Hayden Road|2955
Anstey Nomads|Cropston Road|1000
Basford United|Greenwich Avenue|1600
Bedworth United|The Oval|2900
Belper Town|Christchurch Meadow|2650
Boldmere St Michaels|Trevor Brown Memorial Ground|2500
Bourne Town|Abbey Lawn|2000
Carlton Town|Bill Stokeld Stadium|1968
Coleshill Town|Pack Meadow|2000
Corby Town|Steel Park|3893
Coventry Sphinx|Sphinx Drive|1000
Lichfield City|City Ground|1500
Long Eaton United|Grange Park|1500
Loughborough Students|Loughborough University Stadium|3300
Mickleover|Station Road|1500
Racing Club Warwick|Townsend Meadow|2100
Rugby Borough|Kilsby Lane|1000
Rugby Town|Butlin Road|5000
Shepshed Dynamo|The Dovecote Stadium|2500
St Neots Town|New Rowley Park|3500
Sutton Coldfield Town|Coles Lane|2000
Wellingborough Town|Dog & Duck Football Ground|5000`,
  },
  {
    key: 'SL1C', div: 8, name: 'Southern League Division One Central', short: 'Southern D1 Central', lat: 52.0, lon: -0.7, feeds: 'SLPC',
    clubs: `AFC Dunstable|Creasey Park|3065
Aylesbury United|The Meadow|5000
Barton Rovers|Sharpenhoe Road|4000
Beaconsfield Town|Holloways Park|3500
Biggleswade|The Eyrie|3000
Biggleswade Town|Langford Road|3000
Enfield|Woodside Park|4525
Flackwell Heath|Wilks Park|2000
Hadley|Brickfield Lane|2000
Hertford Town|Hertingfordbury Park|6500
Hitchin Town|Top Field|3529
Leighton Town|Bell Close|2800
Leverstock Green|Pancake Lane|1500
London Lions|Rowley Lane|1500
Marlow|Alfred Davis Memorial Ground|3000
Milton Keynes Irish|Manor Fields|1500
Northwood|Northwood Park|3075
Rayners Lane|Tithe Farm|1000
Stotfold|The JSJ Stadium|1500
Thame United|Meadow View Park|2500
Ware|Wodson Park|3300
Welwyn Garden City|Herns Way|3000`,
  },
  {
    key: 'SL1S', div: 8, name: 'Southern League Division One South', short: 'Southern D1 South', lat: 51.2, lon: -2.4, feeds: 'SLPS',
    clubs: `Bashley|Bashley Road|4250
Bideford|The Sports Ground|6000
Bishop's Cleeve|Kayte Lane|1500
Bristol Manor Farm|The Creek|1700
Brixham|Wall Park Road|2000
Didcot Town|Loop Meadow|3000
Exmouth Town|Southern Road|1500
Falmouth Town|Bickland Park|3572
Frome Town|Badgers Hill|3000
Hartpury|Hartpury University Stadium|2000
Larkhall Athletic|The Plain Ham Ground|1429
Malvern Town|Langland Stadium|2500
Melksham Town|Oakfield Stadium|2500
Portishead Town|Bristol Road|1400
Shaftesbury|Cockrams|2500
Sporting Club Inkberrow|Recreation Ground|500
Swindon Supermarine|Hunts Copse Ground|2000
Tavistock|Langsford Park|2000
Westbury United|Meadow Lane|2500
Willand Rovers|The Stan Robinson Stadium|1000
Winchester City|The City Ground|4500
Cinderford Town|The Causeway|3500`,
  },
  {
    key: 'ISTN', div: 8, name: 'Isthmian League North', short: 'Isthmian North', lat: 51.8, lon: 0.6, feeds: 'ISTP',
    clubs: `Bowers & Pitsea|Len Salmon Stadium|3500
Brantham Athletic|Brantham Leisure Centre|1200
Brightlingsea Regent|North Road|2000
Cambridge City|West Way|3000
Concord Rangers|Thames Road|3300
Downham Town|Memorial Field|1000
Felixstowe & Walton United|Dellwood Avenue|2160
Gorleston|Wellesley Recreation Ground|3600
Grays Athletic|Chadfields|4000
Heybridge Swifts|Scraley Road|3000
Lowestoft Town|Crown Meadow|3000
Maldon & Tiptree|Wallace Binder Ground|2800
Mildenhall Town|Recreation Way|2000
Newmarket Town|Cricket Field Road|2750
Redbridge|Oakside Stadium|3000
Stanway Rovers|Hawthorns|1500
Takeley|Station Road|2000
Tilbury|Chadfields|4000
Waltham Abbey|Capershotts|550
Walthamstow|Wadham Lodge|3500
Witham Town|Spa Road|2500
Wroxham|Trafford Park|2500`,
  },
  {
    key: 'ISTSC', div: 8, name: 'Isthmian League South Central', short: 'Isthmian South Central', lat: 51.4, lon: -0.4, feeds: 'ISTP',
    clubs: `AFC Portchester|Wicor Recreation Ground|1500
Ascot United|The Racecourse Ground|1150
Bedfont Sports|Bedfont Recreation Ground|3000
Binfield|Hill Farm Lane|1000
Bognor Regis Town|Nyewood Lane|4500
Egham Town|Runnymede Stadium|5500
Fareham Town|Cams Alders|4500
Hanworth Villa|Rectory Meadow|1000
Harrow Borough|Earlsmead Stadium|3070
Hartley Wintney|The Memorial Playing Fields|2000
Hayes & Yeading United|SkyEx Community Stadium|3000
Hendon|Silver Jubilee Park|1990
Horndean|Five Heads Park|2000
Kingstonian|Imperial Fields|3500
Leatherhead|Fetcham Grove|2000
Littlehampton Town|The Sportsfield|4000
Metropolitan Police|Imber Court|3000
Moneyfields|John Jenkins Stadium|1180
Raynes Park Vale|Grand Drive|1900
South Park|King George's Field|2000
Southall|SkyEx Community Stadium|3000
Westfield|Woking Park|1500`,
  },
  {
    key: 'ISTSE', div: 8, name: 'Isthmian League South East', short: 'Isthmian South East', lat: 51.1, lon: 0.4, feeds: 'ISTP',
    clubs: `AFC Croydon Athletic|Mayfield Stadium|3000
AFC Whyteleafe|Church Road|2000
Ashford United|The Homelands|3200
Beckenham Town|Eden Park Avenue|4000
Broadbridge Heath|High Wood Hill Sports Ground|2000
Crowborough Athletic|Crowborough Community Stadium|2000
Deal Town|Charles Sports Ground|2000
East Grinstead Town|East Court|3000
Eastbourne Town|The Saffrons|3000
Erith Town|Bayliss Avenue|1000
Faversham Town|Salters Lane|2000
Hassocks|The Beacon Ground|1000
Hastings United|The Pilot Field|4050
Herne Bay|Winch's Field|3000
Jersey Bulls|Springfield Stadium|2000
Margate|Hartsdown Park|2100
Merstham|Moatside|2500
Sevenoaks Town|Greatness Park|1500
Sheppey United|Holm Park|1530
Sittingbourne|Woodstock Park|1930
Three Bridges|Jubilee Field|1500
VCD Athletic|Oakwood|1180`,
  },
  // ---------------- Step 5 (div 9) - the player starts here
  {
    key: 'NL1', div: 9, name: 'Northern League Division One', short: 'Northern D1', lat: 54.7, lon: -1.6, feeds: 'NPLE',
    clubs: `Guisborough Town|King George V Ground
Shildon|Dean Street|2000
Whitley Bay|Hillheads Park|4500
West Auckland Town|Darlington Road|2000
Boro Rangers|Stokesley Sports Club|2000
Newcastle Blue Star|KD Stadium|2500
Kendal Town|Parkside Road
North Shields|Ralph Gardner Park|1500
Easington Colliery|Welfare Park
Birtley Town|Birtley Sports Complex
Horden Community Welfare|Welfare Park
Penrith|Frenchfield Stadium|1500
Newcastle Benfield|Sam Smith's Park|2000
Thornaby|Teesdale Park|5000
Carlisle City|Gillford Park
Marske United|Mount Pleasant|2500
Crook Town|Millfield Ground|1500
Whickham|Glebe Sports Ground|4000
Northallerton Town|Calvert Stadium`,
  },
  {
    key: 'NCEP', div: 9, name: 'Northern Counties East Premier', short: 'NCEL Premier', lat: 53.6, lon: -1.2, feeds: 'NPLE',
    clubs: `Albion Sports|Myra Shay|500
Barton Town|Euronics Ground|3000
Beverley Town|Norwood Recreation Ground|1500
Bottesford Town|Birch Park|1000
Campion|Scotchman Road|1000
Eccleshill United|Cougar Park|2225
Frickley Athletic|Westfield Lane|2087
Golcar United|Longfield Avenue|1200
Handsworth|Oliver's Mount|2500
Horbury Town|Slazengers Sports Complex|800
Knaresborough Town|Manse Lane|1000
Liversedge|Clayborn|2000
Parkgate|Roundwood Sports Complex|1000
Penistone Church|Church View Road|1000
Pickering Town|Mill Lane|2000
Rossington Main|Welfare Ground|2000
Sheffield FC|Home of Football Ground|2089
Tadcaster Albion|Ings Lane|2000
Thackley|Dennyfield|3000
Wombwell Town|Recreation Ground|500`,
  },
  {
    key: 'NWCP', div: 9, name: 'North West Counties Premier', short: 'NWCL Premier', lat: 53.5, lon: -2.6, feeds: 'NPLW',
    clubs: `Abbey Hey|The Abbey Stadium
AFC Liverpool|Rossett Park
Atherton Laburnum Rovers|Crilly Park
Barnoldswick Town|Greenberfield Lane
Burscough|The Community Stadium
Chadderton|MCA Stadium
Charnock Richard|Mossie Park
Cheadle Town|Park Road Stadium
City of Liverpool|The Community Stadium
Euxton Villa|Jim Fowler Memorial Ground
FC Isle of Man|The Bowl
FC St Helens|Windleshaw Sports
Glossop North End|Surrey Street
Irlam|Silver Street
Litherland REMYCA|Litherland Sports Park
Longridge Town|Mike Riding Ground
Padiham|Arbories Memorial Sports Ground
Pilkington|Ruskin Drive Sportsground
Prestwich Heys|Adie Moran Park
Ramsbottom United|Riverside Stadium
South Liverpool|Jericho Lane
Stockport Town|Stockport Sports Village
West Didsbury & Chorlton|Brookburn Road
Wythenshawe|Hollyhedge Park`,
  },
  {
    key: 'MLP', div: 9, name: 'Midland League Premier', short: 'Midland Premier', lat: 52.5, lon: -1.9, feeds: 'NPLM',
    clubs: `1874 Northwich|The Offside Trust Stadium|3000
Abbey Hulton United|Birches Head Road
AFC Wolverhampton City|Castlecroft Stadium|2000
Brocton|Silkmore Lane|1500
Coton Green|New Mill Lane
Dudley Town|Aspray Arena
Hanley Town|Potteries Park|1300
Highgate United|The Coppice|2000
Lye Town|Lye Sports Ground|1000
Northwich Victoria|APEC Taxis Stadium
Romulus|Castle Vale Stadium|2000
Stone Old Alleynians|King's Park
Stourport Swifts|Walshes Meadow|2000
Studley|The Beehive
Tividale|The Beeches|2000
Uttoxeter Town|Oldfields
Whitchurch Alport|Yockings Park
Winsford United|Barton Stadium|3000`,
  },
  {
    key: 'UCPN', div: 9, name: 'United Counties Premier North', short: 'UCL Premier North', lat: 52.9, lon: -0.8, feeds: 'NPLM',
    clubs: `AFC Mansfield|Forest Town Stadium
Ashby Ivanhoe|NFU Sports Ground
Belper United|Coronation Park
Blackstones|Lincoln Road|1000
Boston Town|Tattershall Road|6000
Clay Cross Town|Mill Lane
Deeping Rangers|Haydon Whitham Stadium|2000
Eastwood|Coronation Park
Grantham Town|South Kesteven Sports Stadium|7500
Gresley Rovers|Moat Ground|2400
Harrowby United|Dickens Road
Heanor Town|Town Ground|2700
Hucknall Town|RM Stadium|4000
Kimberley Miners Welfare|Stag Ground
Melton Town|Melton Sports Village
Newark and Sherwood United|Dickens Road
Newark Town|YMCA Sports Village
Sherwood Colliery|Debdale Park|1000
Skegness Town|Vertigo Stadium
Wisbech Town|Fenland Stadium|1118`,
  },
  {
    key: 'UCPS', div: 9, name: 'United Counties Premier South', short: 'UCL Premier South', lat: 52.3, lon: -0.6, feeds: 'SL1C',
    clubs: `Atherstone Town|Sheepy Road
Aylestone Park|Saffron Lane|1128
Bugbrooke St Michaels|Birds Close|2500
Coventry United|Nick Newbold Stadium|4000
Daventry Town|Elderstubbs|1855
Easington Sports|Addison Road
Eynesbury Rovers|Alfred Hall Memorial Ground
GNG Oadby Town|Riverside|3000
Godmanchester Rovers|Bearscroft Lane
Hinckley|Kirkby Road|2500
Histon|Bridge Road|4300
Leicester Nirvana|Hamilton Park
Lutterworth Town|Dunley Way
March Town United|GER Sports Ground
Moulton|Brunting Road
Newport Pagnell Town|Willen Road|2000
Northampton ON Chenecks|Old Northamptonians Sports Ground
Northampton Sileby Rangers|Fernie Fields
Nuneaton Town|The Oval|4614
Yaxley|Leading Drove|1000`,
  },
  {
    key: 'ECP', div: 9, name: 'Eastern Counties Premier', short: 'ECL Premier', lat: 52.4, lon: 1.0, feeds: 'ISTN',
    clubs: `Cornard United|Blackhouse Lane
Dereham Town|Aldiss Park|3000
Ely City|Unwin Sports Ground|1500
Fakenham Town|Clipbush Park|2000
Great Yarmouth Town|Wellesley Recreation Ground|3600
Hadleigh United|Millfield|3000
Harleston Town|Wilderness Lane
Haverhill Rovers|New Croft|3000
Heacham|Station Road
Ipswich Wanderers|Humber Doucy Lane|550
Kirkley & Pakefield|Walmer Road|2000
Lakenheath|The Nest
Mulbarton Wanderers|Mulberry Park
Soham Town Rangers|Julius Martin Lane|2000
Stowmarket Town|Greens Meadow|1000
Thetford Town|Mundford Road|1500
Walsham-le-Willows|Summer Road|1000
Woodbridge Town|Notcutts Park|3000`,
  },
  {
    key: 'ESL', div: 9, name: 'Essex Senior League', short: 'Essex Senior', lat: 51.6, lon: 0.4, feeds: 'ISTN',
    clubs: `Athletic Newham|Bobby Moore Sports Hub|800
Barking|Mayesbrook Park|2500
Basildon United|Gardiners Close|3000
Benfleet|Woodside Stadium|4100
Buckhurst Hill|Roding Lane|1500
Frenford|The Jack Carter Centre|500
Great Wakering Rovers|Burroughs Park|2500
Hackney Wick|Simarco Stadium|2500
Halstead Town|Rosemary Lane|3500
Harwich & Parkeston|Royal Oak|3000
Hullbridge Sports|Lower Road|1500
Ilford|Cricklefield Stadium|3500
Little Oakley|War Memorial Ground|1000
Romford|Mayesbrook Park|2500
Saffron Walden Town|Catons Lane|3000
Soul Tower Hamlets|Mile End Stadium|3000
Sporting Bengal United|Mile End Stadium|3000
West Essex|Wadham Lodge|3500
White Ensign|Burroughs Park|2500
Woodford Town|Ashton Playing Fields|3000`,
  },
  {
    key: 'SSMP', div: 9, name: 'Spartan South Midlands Premier', short: 'SSML Premier', lat: 51.8, lon: -0.5, feeds: 'SL1C',
    clubs: `AFC Welwyn|Vauxhall Road|3152
Arlesey Town|Hitchin Road|2920
Aylesbury Vale Dynamos|Haywood Way
Baldock Town|Baldock Arena
Biggleswade United|Fairfield Road|2000
Cockfosters|Chalk Lane|1000
Colney Heath|Recreation Ground
Crawley Green|The Brache|4000
Dunstable Town|Creasey Park|3065
Haringey Borough|Coles Park|2500
Harlow Town|The Harlow Arena|3500
Harpenden Town|Rothamsted Park
Kempston Rovers|Hillgrounds Leisure|2000
Kings Langley|Sadiku Stadium|1963
Potton United|The Hollow
Risborough Rangers|The KAMTECH Stadium|1500
Sawbridgeworth Town|Crofters End|2500
Tring Athletic|Grass Roots Stadium
Winslow United|Elmfields Gate|2000
Wormley Rovers|Wormley Playing Fields|500`,
  },
  {
    key: 'HLP', div: 9, name: 'Hellenic League Premier', short: 'Hellenic Premier', lat: 51.8, lon: -1.6, feeds: 'SL1S',
    clubs: `Cinderford Town|Causeway Ground|3500
Cirencester Town|Corinium Stadium|4500
Cribbs|The Lawns|1000
Corsham Town|Southbank|1200
Droitwich Spa|King George V Ground|2000
Fairford Town|Cinder Lane|2000
Hallen|Hallen Centre|2000
Hereford Pegasus|Old School Lane|2000
Highworth Town|The Elms Recreation Ground|2000
Longlevens|Saw Mills End|500
Lydney Town|Lydney Recreation Ground|700
Mangotsfield United|Cossham Street|2500
Pershore Town|Community Stadium|4000
Roman Glass St George|Oaklands Park|2000
Royal Wootton Bassett Town|Gerard Buxton Sports Ground|2000
Slimbridge|Thornhill Park|1500
Thornbury Town|Mundy Playing Fields|1000
Tuffley Rovers|Glevum Park|1000
Westfields|allpay.park|2000
Worcester Raiders|Claines Lane|1000`,
  },
  {
    key: 'CCPN', div: 9, name: 'Combined Counties Premier North', short: 'CCL Premier North', lat: 51.5, lon: -0.5, feeds: 'ISTSC',
    clubs: `Abingdon United|The Northcourt|2000
Amersham Town|Spratleys Meadow|1500
Ardley United|The Playing Fields|1000
Ashford Town (Middlesex)|Robert Parker Stadium|2550
British Airways|Berkeley Fields|2000
Broadfields United|Tithe Farm|1000
Burnham|The 1878 Stadium|2500
Edgware & Kingsbury|Silver Jubilee Park|1990
Harefield United|Preston Park|1200
Hilltop|Silver Jubilee Park|1990
Holyport|Summerleaze Village|1000
Kidlington|Yarnton Road|1500
Milton United|Potash Lane|1000
North Greenford United|Berkeley Fields|2000
North Leigh|Eynsham Hall Park|2000
Reading City|Rivermoor Stadium|2000
Virginia Water|Arbour Park|2000
Wallingford & Crowmarsh|Hithercroft|1500
Windsor & Eton|Stag Meadow|4500
Wokingham Town|Lowther Road|1000`,
  },
  {
    key: 'CCPS', div: 9, name: 'Combined Counties Premier South', short: 'CCL Premier South', lat: 51.2, lon: -0.4, feeds: 'ISTSC',
    clubs: `Abbey Rangers|Addlestone Moor|1000
Alton|Anstey Park|2000
Badshot Lea|Westfield Lane|1200
Balham|Imperial Fields|3500
Camberley Town|Krooner Park|1976
Chipstead|High Road|2000
Cobham|Leg O'Mutton Field|2000
Corinthian-Casuals|King George's Field|2700
Epsom & Ewell|Leg O'Mutton Field|2000
Eversley & California|Fox Lane|1000
Fleet Town|Calthorpe Park|2000
Guildford City|Spectrum Football Ground|1320
Horley Town|The New Defence|1800
Knaphill|Redding Way|1000
Redhill|Kiln Brow|2000
Sheerwater|Eastwood Centre|600
Sutton Common Rovers|War Memorial Sports Ground|5000
Tadley Calleva|Barlows Park|1000
Thatcham Town|Waterside Park|1500
Tooting & Mitcham United|Imperial Fields|3500`,
  },
  {
    key: 'SCFP', div: 9, name: 'Southern Combination Premier', short: 'SCFL Premier', lat: 50.9, lon: -0.3, feeds: 'ISTSE',
    clubs: `AFC Varndeanians|Withdean Stadium|8850
Bexhill United|The Polegrove|1000
Crawley Down Gatwick|The Haven Centre|1000
Eastbourne United|The Oval|1200
Forest Row|Jubilee Field|1500
Guernsey|Victoria Park|5000
Haywards Heath Town|Hanbury Park|2000
Horsham YM|Gorings Mead|1575
Lancing|Culver Road|1500
Lingfield|The Sports Pavilion|2000
Little Common|Little Common Recreation Ground|1200
Midhurst & Easebourne|Rotherfield|1000
Newhaven|The Trafalgar Ground|3000
Pagham|Nyetimber Lane|1500
Peacehaven & Telscombe|The Sports Park|3000
Roffey|Bartholomew Way|1000
Seaford Town|The Crouch
Shoreham|Middle Road|2000
Steyning Town|The Shooting Field|2000
Wick|Crabtree Park|2000`,
  },
  {
    key: 'SCEP', div: 9, name: 'Southern Counties East Premier', short: 'SCEL Premier', lat: 51.3, lon: 0.6, feeds: 'ISTSE',
    clubs: `Bearsted|Honey Lane|1000
Chislehurst Glebe|Foxbury Avenue|1200
Corinthian|Gay Dawn Farm|2000
Erith & Belvedere|Park View Road|4000
Faversham Strike Force|The Belmont Ground|3000
Fisher|St Paul's Sports Ground|2500
Hollands & Blair|Star Meadow|1000
Holmesdale|Oakley Road
Hythe Town|Reachfields Stadium|3000
Kennington|The Homelands|3200
Larkfield & New Hythe Wanderers|Larkfield Sports Club|3000
Phoenix Sports|Phoenix Sports Ground|2000
Punjab United|Elite Venue|600
Rusthall|The Jockey Farm Stadium|1500
Snodland Town|Potyns Sports Ground|1000
Stansfeld|Badgers Sports Ground|1550
Sutton Athletic|Lower Road
Tunbridge Wells|Culverden Stadium|3750
Whitstable Town|The Belmont Ground|3000`,
  },
  {
    key: 'WXP', div: 9, name: 'Wessex League Premier', short: 'Wessex Premier', lat: 50.9, lon: -1.5, feeds: 'SL1S',
    clubs: `AFC Stoneham|Stoneham Lane Football Complex|1000
Andover New Street|Foxcotte Park|1000
Baffins Milton Rovers|PMC Stadium
Bemerton Heath Harlequins|Moon Park|2100
Bournemouth FC|Victoria Park|3000
Brockenhurst|Grigg Lane|2000
Christchurch|Hurn Bridge Sports Club|2000
Cowes Sports|Westwood Park|2000
Downton|Brian Whitehead Sports Ground|2000
East Cowes Victoria Athletic|Beatrice Avenue|1000
Hamble Club|Hamble Community Facility
Hamworthy Recreation|Magna Road|1500
Hythe & Dibden|Clayfields Sport Centre|1000
Laverstock & Ford|Church Road
Millbrook (Hampshire)|Test Park|1000
New Milton Town|Fawcetts Field|3000
Petersfield Town|Southdown Builders Stadium|3000
Portland United|Camp and Satherley Stadium|2000
Sherborne Town|Raleigh Grove|1150
Wincanton Town|Wincanton Sports Ground|1000`,
  },
  {
    key: 'WEP', div: 9, name: 'Western League Premier', short: 'Western Premier', lat: 51.2, lon: -2.9, feeds: 'SL1S',
    clubs: `Barnstaple Town|Mill Road|5000
Bradford Town|Trowbridge Road|1000
Bridgwater United|Fairfax Park|2500
Brislington|Ironmould Lane|3000
Buckland Athletic|Homers Heath|1000
Clevedon Town|North Somerset Community Stadium|3900
Helston Athletic|Kellaway Park|1300
Ivybridge Town|Erme Valley|2000
Newquay|Mount Wise Stadium|5000
Oldland Abbotonians|Aitchison Playing Field|1000
Paulton Rovers|Winterfield Stadium|2500
Saltash United|Kimberley Stadium|1000
Shepton Mallet|Old Wells Road|2500
Sidmouth Town|Manstone Recreation Ground|2500
St Blazey|Blaise Park|3500
Street|The Tannery Ground|1000
Torpoint Athletic|The Mill|1000
Wellington|Wellington Playing Field|1000`,
  },
  // ---------------- Step 6 (div 10)
  {
    key: 'NL2', div: 10, name: 'Northern League Division Two', short: 'Northern D2', lat: 54.7, lon: -1.6, feeds: 'NL1',
    clubs: `AFC Newbiggin|Newbiggin Sports Centre
Alnwick Town|St James' Park|2500
Billingham Synthonia|Stokesley Sports Club|2000
Billingham Town|Bedford Terrace|3000
Boldon Community Association|Boldon Colliery Welfare
Chester-le-Street Town|Moor Park
Darlington Town|Eastbourne Community Stadium
Durham United|Graham Sports Centre
Esh Winning|West Terrace|3500
FC Hartlepool|Grayfields Enclosure
Grangetown Boys Club|Grangetown Stadium
Jarrow|Perth Green
Newcastle University|Essity Park
Park View|Riverside
Prudhoe Youth Club|Essity Park
Redcar Town|Mo Mowlam Memorial Park
Ryton & Crawcrook Albion|Kingsley Park|1500
Seaham Red Star|Seaham Town Park
Sunderland RCA|Meadow Park|1500
Sunderland West End|Ford Hub Sports Complex
Tow Law Town|Ironworks Road|3000
Yarm & Eaglescliffe|Bedford Terrace|3000`,
  },
  {
    key: 'NCE1', div: 10, name: 'Northern Counties East Division One', short: 'NCEL D1', lat: 53.6, lon: -1.3, feeds: 'NCEP',
    clubs: `Appleby Frodingham|Brumby Hall Sports Ground|1100
Armthorpe Welfare|Welfare Ground|2500
Athersley Recreation|Sheerien Park|2000
Brigg Town|The Hawthorns|2500
Club Thorne Colliery|Chesterfield Poultry Stadium|1200
Crowle Colts|Windsor Park|500
Dearne & District|Welfare Ground|1000
Doncaster City|Welfare Ground|2500
Glasshoughton Welfare|Glasshoughton Centre|2000
Goole|Victoria Pleasure Grounds|3000
Harrogate Railway Athletic|Station View|3500
Ilkley Town|Ben Rhydding Sports Club|700
Leeds UFCA|Crofton Community Centre|1500
Louth Town|Marshlands|500
Maltby Main|Muglet Lane|2000
Nostell Miners Welfare|Crofton Community Centre|1500
Route One Rovers|Myra Shay|500
Selby Town|Richard Street|5000
South Leeds|South Leeds Stadium|3450
Wakefield|Post Office Road|6954
Winterton Rangers|West Street|3000
Worsbrough Bridge Athletic|Park Road|2000`,
  },
  {
    key: 'NWC1N', div: 10, name: 'North West Counties Division One North', short: 'NWCL D1 North', lat: 53.8, lon: -2.6, feeds: 'NWCP',
    clubs: `AFC Blackpool|The Mechanics
Ashton Athletic|Brockstedes Park
Ashton Town|Edge Green Street
Bacup Borough|West View
Colne|Holt House
Daisy Hill|New Sirs
Darwen|The Anchor Ground
Droylsden|Butcher's Arms Ground
Fulwood Amateurs|Lightfoot Green
Garstang|The Riverside
Holker Old Boys|Rakesmoor Lane
Maghull|Old Hall Field
Maine Road|Brantingham Road
MSB Woolton|Jericho Lane
Nelson|Victoria Park
Squires Gate|Brian Addison Stadium
Steeton|Marley Stadium
Thornton Cleveleys|Gamble Road`,
  },
  {
    key: 'NWC1S', div: 10, name: 'North West Counties Division One South', short: 'NWCL D1 South', lat: 53.3, lon: -2.5, feeds: 'NWCP',
    clubs: `Allscott Heath|Allscott Sports & Social Club
Alsager Town|Wood Park Stadium
Ashville|Villa Park
Barnton|Townfield
Cammell Laird 1907|Kirklands
Cheadle Heath Nomads|The Heath
Eccleshall|Pershall Park
Foley Meir|Whitcombe Road
Haughmond|Shrewsbury Sports Village
Market Drayton Town|Greenfields Sports Ground
New Mills|Church Lane
Runcorn Town|Viridor Community Stadium
Sandbach United|Sandbach Community Football Centre
Shawbury United|New Meadow Community 3G
Stafford Town|Evans Park
Stockport Georgians|Cromley Road
Telford Town|DRM Aggregates Arena
Wolverhampton Casuals|Brinsford Lane`,
  },
  {
    key: 'ML1', div: 10, name: 'Midland League Division One', short: 'Midland D1', lat: 52.5, lon: -1.8, feeds: 'MLP',
    clubs: `AFC Bridgnorth|Crown Meadow
AFC North Kilworth|North Kilworth Sports Ground
Bilston Town|Queen Street|4000
Birstall United|Meadow Lane
Chelmsley Town|Pack Meadow
Coventry Copsewood|Allard Way|2000
Cradley Town|Beeches View
Gornal Athletic|Garden Walk Stadium|1500
Heather St John's|St John's Park|2050
Ingles|Homestead Road|2050
Kirby Muxloe|Ratby Lane|3000
Knowle|Robins' Nest
Leicester St Andrews|Canal Street|1000
Lutterworth Athletic|Hall Park
Nuneaton Griff|Pingles Stadium|4000
OJM CFC|Triplex Sports Ground
Saffron Dynamo|Kings Park
Smethwick Rangers|Trevor Brown Memorial Ground|2500
Stapenhill|Edge Hill|1500
Sutton United (Birmingham)|Coleshill Road
Wednesfield|Cottage Ground`,
  },
  {
    key: 'UC1', div: 10, name: 'United Counties Division One', short: 'UCL D1', lat: 52.6, lon: -0.6, feeds: 'UCPN',
    clubs: `Clifton All Whites|Green Lane
Clipstone|Lido Ground
Coalville Town|Mander Cruickshank Stadium
Dronfield Town|Stonelow Ground|500
Dunkirk|Lenton Lane
FCV Grace Dieu|Grace Dieu Manor Park
Gedling Miners Welfare|Plains Road
Holwell Sports|Welby Road|1000
Pinchbeck United|Sir Halley Stewart Field|2700
Pinxton|The Welfare Ground
Radford|Selhurst Street
Rainworth Miners Welfare|Welfare Ground
Retford|The Rail|1000
Retford United|Cannon Park|2000
Sandiacre Town|St Giles Park
Shirebrook Town|Langwith Road|2000
Sleaford Town|Eslaforde Park|1000
South Normanton Athletic|Lees Lane|3000
Southwell City|Centenary Ground
Stapleford Town|Hickings Lane
Staveley Miners Welfare|Inkersall Road|5000
Swallownest|Miners Welfare Ground|500
West Bridgford|Regatta Way`,
  },
  {
    key: 'EC1N', div: 10, name: 'Eastern Counties Division One North', short: 'ECL D1 North', lat: 52.6, lon: 1.1, feeds: 'ECP',
    clubs: `AFC Sudbury Reserves|King's Marsh|2500
Diss Town|Brewers Green Lane|2500
Dussindale & Hellesdon Rovers|The Nest|1000
FC Clacton|Rush Green Bowl|3000
FC Parson Drove|Main Road
FC Peterborough|The Focus Centre
Framlingham Town|Badingham Road
Gorleston Reserves|The Nest|1000
Halesworth Town|Dairy Hill
Haverhill Borough|New Croft|3000
Holbeach United|Carters Park|4000
Holland|Dulwich Road
Kings Park Rangers|Blackhouse Lane
Leiston Under 23s|Victory Road|2500
Long Melford|Stoneylands
Needham Market Reserves|Bloomfields|4000
Stanway Pegasus|West Street|2000
Whittlesey Athletic|Feldale Field
Wivenhoe Town|Broad Lane|2876
Wroxham Reserves|Trafford Park|2500`,
  },
  {
    key: 'EC1S', div: 10, name: 'Eastern Counties Division One South', short: 'ECL D1 South', lat: 51.9, lon: 0.8, feeds: 'ESL',
    clubs: `AS London|New River Stadium|5000
Barkingside|Cricklefield Stadium|3500
Basildon Town|Gardiners Close|2000
Brimsdown|Wormley Playing Fields|500
Burnham Ramblers|Leslie Fields|2000
Cannons Wood|Parkside Stadium|3500
Clapton Community|The Old Spotted Dog Ground|2000
Coggeshall Town|West Street|2000
Dunmow Town|Scraley Road|3000
Enfield Borough|Maurice Rebak Stadium|1500
FC Baresi|Wodson Park|3300
FC Romania|Theobalds Lane|3000
Hoddesdon Town|Lowfield|3000
Hutton|New Lodge|3500
Lymore Gardens|Oakside Stadium|3000
May & Baker|Parsloes Park|1500
Newbury Forest|Oakside Stadium|3000
NW London|Coles Park|2500
Rayleigh Town|Thames Road|3300
Southend Manor|Southchurch Park|2000
Stansted|Hargrave Park|2000`,
  },
  {
    key: 'SSM1', div: 10, name: 'Spartan South Midlands Division One', short: 'SSML D1', lat: 51.9, lon: -0.4, feeds: 'SSMP',
    clubs: `Ampthill Town|Ampthill Park|1300
Belstone|Medburn Ground|1000
Buckingham|Stratford Fields
Cranfield United|Crawley Road
Desborough Town|Waterworks Field|1000
Eaton Socon|River Road
Everett Rovers|Leggatts Green
Huntingdon Town|Jubilee Park
Irchester United|Alfred Street|1800
Langford|Forde Park|2800
Leighton Town Reserves|Bell Close|2800
Letchworth Garden City Eagles|Pixmore Pitches
London Colney|Cotlandswick Park|1000
Long Buckby|Station Road|1000
New Bradwell St Peter|The Recreation Ground|1000
Rothwell Corinthians|Desborough Road
Royston Town Reserves|Garden Walk|5000
Rushden & Higham United|Hayden Road|1500
Shefford Town & Campton|Shefford Sports Club|1000
Stotfold Reserves|The JSJ Stadium|1500
Wellingborough Whitworth|Victoria Mill Ground|2140`,
  },
  {
    key: 'HL1', div: 10, name: 'Hellenic League Division One', short: 'Hellenic D1', lat: 51.8, lon: -1.5, feeds: 'HLP',
    clubs: `Alcester Town|Stratford Road
Bewdley Town|Ribbesford Meadows|1000
Brimscombe & Thrupp|The Meadow|1000
Carterton|Kilkenny Lane|1500
Cheltenham Saracens|Petersfield Park|1000
Chipping Sodbury Town|The Ridings|1000
Clanfield 85|Radcot Road|2000
FC Stratford|Knights Lane|3000
Ludlow|Ludlow Football Stadium|1000
Malmesbury Victoria|The Flying Monk Ground|1000
Newent Town|Wildsmith Meadow|1000
Redditch Borough|The Cherry Tree Stadium|3000
Shortwood United|Meadowbank Ground|2000
Stonehouse Town|Oldends Lane|3000
Thame United Reserves|Meadow View Park|2000
Wantage Town|Alfredian Park|1500
Wellington (Herefords)|Wellington Playing Fields
Woodford United|Byfield Road|3000`,
  },
  {
    key: 'CC1', div: 10, name: 'Combined Counties Division One', short: 'CCL D1', lat: 51.3, lon: -0.4, feeds: 'CCPN',
    clubs: `Bedfont|The Orchard|1200
Berks County|Ascot Racecourse|1150
Brook House|Farm Park|2000
Chalfont St Peter|Mill Meadow|1500
Colliers Wood United|Wibbandune Sports Ground|2000
FC Deportivo Galicia|Bedfont Recreation Ground|3000
Hillingdon Borough|Middlesex Stadium|3587
Holmer Green|Watchet Lane
Langley|Arbour Park|2000
London Samurai Rovers|Rectory Meadow|1000
Molesey|Walton Road|4000
Oxhey Jets|The Boundary Stadium|2000
Penn & Tylers Green|French School Meadow|900
PFC Victoria London|Robert Parker Stadium|2550
Rising Ballers Kensington|Northwood Park|3075
Sandhurst Town|Bottom Meadow|1950
Spartans Youth|The Orchard|1200
Spelthorne Sports|Spelthorne Sports Club|1000
Sport London e Benfica|Spratleys Meadow|1500
Staines & Lammas|Spelthorne Sports Club|1000
Wembley|Vale Farm|2450
Westside|Wibbandune Sports Ground|2000
Woodley United|Rivermoor Stadium|2000`,
  },
  {
    key: 'SCF1', div: 10, name: 'Southern Combination Division One', short: 'SCFL D1', lat: 50.9, lon: -0.2, feeds: 'SCFP',
    clubs: `AFC Uckfield Town|The Oaks|600
AFC Walcountians|Walcountians Sports Club
Arundel|Mill Road|2200
Billingshurst|Jubilee Fields
Copthorne|Camping World Community Stadium|1300
Dorking Wanderers B|Meadowbank|3000
East Preston|The Lashmar|1000
Godalming Town|Bill Kyte Stadium|3000
Infinity|Sidlesham Recreation Ground
Jarvis Brook|Jarvis Brook Sports Club
Loxwood|Plaistow Road|1000
Mile Oak|Mile Oak Recreation Ground
Oakwood|Tinsley Lane
Reigate Priory|Park Lane
Ringmer|King's Academy Ringmer
Saltdean United|Hill Park|1000
Selsey|Bunn Leisure Stadium
Worthing United|Robert Albon Memorial Ground|1504`,
  },
  {
    key: 'SCE1', div: 10, name: 'Southern Counties East Division One', short: 'SCEL D1', lat: 51.3, lon: 0.5, feeds: 'SCEP',
    clubs: `AFC Greenwich Borough|Oakley Road
Banstead Athletic|Merland Rise|1500
Bridon Ropes|Meridian Sports Club
Chessington & Hook United|Chalky Lane|3000
Croydon|Croydon Arena|8000
FC Elmstead|Lower Road
Greenways|Rochester United Sports Ground|1000
Halls Athletic|Princes Park|4100
Lewisham Borough|Ladywell Arena
Lordswood|Martyn Grove|600
Lydd Town|The Lindsey Field|1000
Rochester United|Rochester United Sports Ground|1000
SE Dons|The Bauvill Stadium|5000
Sheppey Sports|Holm Park|1530
Sporting Club Thamesmead|Bayliss Avenue|800
Staplehurst Monarchs|Jubilee Sports Ground|1000
Tooting Bec|High Road|2000
Welling Town|Erith Leisure Centre`,
  },
  {
    key: 'WX1', div: 10, name: 'Wessex League Division One', short: 'Wessex D1', lat: 50.9, lon: -1.4, feeds: 'WXP',
    clubs: `AFC Aldermaston|Waterside Park|1500
Alresford Town|Arlebury Park|1000
Amesbury Town|Bonnymead Park|1000
Ash United|Shawfield Road|2500
Blackfield & Langley|Gang Warily Recreation Centre|2500
Clanfield|Westleigh Park|5300
Colden Common|Charters Community Stadium|4500
Cove|Squirrel Lane
Fawley|Waterside Sports Club|1000
Fleetlands|DARA Fleetlands|1000
Folland Sports|Folland Park|1000
Frimley Green|Frimley Green Recreation Ground|2000
Hamworthy United|County Ground|1000
Kintbury Rangers|The Recreation Ground
Lymington Town|The Sports Ground|1000
Newport (IOW)|Beatrice Avenue|1000
Ringwood Town|Long Lane|1000
Romsey Town|Southampton Road
Totton & Eling|Little Testwood Farm|1500
United Services Portsmouth|Victory Stadium|1000
Whitchurch United|Longmeadow|1000
Yateley United|Sean Devereux Park|500`,
  },
  {
    key: 'WE1', div: 10, name: 'Western League Division One', short: 'Western D1', lat: 51.3, lon: -2.6, feeds: 'WEP',
    clubs: `AEK Boco|Greenbank Recreation Ground|1000
Almondsbury|The Field
Avonmouth|King George V Recreation Ground
Bitton|Bath Road
Bristol Telephones|BTRA Sports Ground|1000
Cadbury Heath|Cadbury Heath Road
Calne Town|Bremhill View|2500
Cheddar|Draycott Road
Devizes Town|Nursteed Road|2500
Hengrove Athletic|Norton Lane|1000
Keynsham Town|AJN Stadium|3001
Longwell Green Sports|Longwell Green Community Centre|1000
Mendip Broadwalk|Filwood Park Playing Fields|1000
Odd Down|Lew Hill Memorial Ground|1000
Radstock Town|Southfields Recreation Ground|1250
Shirehampton|Penpole Lane|1000
Sturminster Newton United|Barnets Field|1000
Warminster Town|Weymouth Street|1000
Wells City|Athletic Ground|1500
Welton Rovers|West Clewes Recreation Ground|2400`,
  },
  {
    key: 'SWPE', div: 10, name: 'South West Peninsula Premier East', short: 'SWPL East', lat: 50.6, lon: -3.6, feeds: 'WEP',
    clubs: `Bude Town|Broadclose Park|2000
Callington Town|Marshfield Parc|1000
Camelford|Trefrew Park|1000
Dobwalls|Lantoom Park|2000
Elburton Villa|Haye Road|2000
Falmouth Town Reserves|Bickland Park|3572
Holsworthy|Upcott Field|2000
Launceston|Pennygillam|1000
Liskeard Athletic|Lux Park|2000
Millbrook (Cornwall)|Jenkins Park|1000
Penzance|Penlee Park|1100
St Day|Vogue Park
Sticker|Burngullow Lane|2000
Wadebridge Town|Bodieve Park|1500
Wendron United|Underlane|1000`,
  },
  {
    key: 'SWPW', div: 10, name: 'South West Peninsula Premier West', short: 'SWPL West', lat: 50.3, lon: -4.9, feeds: 'WEP',
    clubs: `Axminster Town|Tiger Way|3000
Bishops Lydeard|Darby Way|1000
Bovey Tracey|Mill Marsh Park|3000
Bridport|St Mary's Field|2000
Crediton United|Lords Meadow|3000
Cullompton Rangers|Speeds Meadow|1000
Honiton Town|Mountbatten Park|800
Ilfracombe Town|Marlborough Park|2000
Ilminster Town|Archie Gooch Pavilion
Middlezoy Rovers|Ethan Berry Pavilion|1000
Newton Abbot Spurs|Recreation Ground|3000
Okehampton Argyle|Simmons Park|2500
Stoke Gabriel & Torbay Police|Churchward Memorial Ground|1000
Teignmouth|Coombe Valley|2000
Torridgeside|Donnacroft|1000
Torrington|Vicarage Field|500`,
  },
];

/** Division OVR bands (DESIGN.md 4.4): average starter OVR per division. */
export const DIV_AVG_OVR = [0, 80, 72, 66, 61, 56, 52, 48, 44, 40, 36];
