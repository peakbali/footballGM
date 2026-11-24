/** Name pools for generated players and staff. Weighted by nationality. */
export const NAMES: Record<string, { first: string[]; last: string[] }> = {
  ENG: {
    first: 'Harry Jack Oliver Charlie George Jacob Alfie Thomas Joshua James William Oscar Leo Archie Henry Joseph Samuel Max Daniel Lewis Ryan Callum Kieran Liam Connor Jordan Ben Luke Adam Nathan Tom Sam Joe Dan Matt Josh Kyle Reece Bradley Ashley Jamie Scott Dean Lee Craig Mark Paul Aaron Elliot Ethan Mason Tyler Louis Freddie Alex Toby Finley Harvey Billy Jake Zach Rhys Owen Dylan Marcus Theo Jayden Kai Ollie Cameron Sean Danny Ellis Brandon Jordan Morgan Taylor Rory Jesse Ronnie Stanley Arthur Ted Albie Frankie Louie Bobby Ryan Will Joel Isaac Caleb Lucas Kian Tyrell Jaden Romeo'.split(' '),
    last: 'Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Hughes Edwards Turner Hill Moore Clark Harrison Scott Cooper Ward Morris King Watson Baker Harris Lee Young Allen Mitchell Anderson Lewis Bell Carter Phillips Parker Price Bennett Shaw Cook Richardson Marshall Holmes Mills Dixon Chapman Ellis Gray Fox Hunt Barker Mason Rose Pearce Stone Webb Lloyd Barnes Knight Butler Russell Fisher Burton Hart Fletcher Dawson Bailey Spencer Watts Reid Kelly Murray Palmer Gibson Ford Dean Lane Riley Hudson Payne Owen Hayes Sutton Cross Booth Hargreaves Kirk Sharp Oakley Ashworth Pickering Brennan Pratt Whitaker Hancock Barlow Fenwick Thornton Cartwright'.split(' '),
  },
  SCO: { first: 'Callum Ross Fraser Euan Lewis Kyle Jamie Craig Greg Andrew Stuart Ewan Calum Blair'.split(' '), last: 'MacDonald Campbell Stewart Murray Fraser Ross Robertson McGregor Henderson Paterson Ferguson Cameron McLean Kerr'.split(' ') },
  WAL: { first: 'Rhys Dafydd Gareth Owain Iwan Cai Aled Gethin Morgan Rhodri'.split(' '), last: 'Jones Williams Davies Evans Thomas Roberts Hughes Lewis Morgan Griffiths Price Pritchard'.split(' ') },
  IRL: { first: 'Sean Conor Cian Oisin Darragh Eoin Ciaran Padraig Niall Shane Ronan Fionn'.split(' '), last: "Murphy Kelly O'Sullivan Walsh O'Brien Byrne Ryan O'Connor Doyle McCarthy Gallagher Kavanagh".split(' ') },
  NGA: { first: 'Chidi Emeka Tunde Femi Ola Segun Kelechi Ade Chukwuma Yinka'.split(' '), last: 'Okafor Adeyemi Balogun Eze Okonkwo Adebayo Nwosu Ogunleye Afolabi Ibe'.split(' ') },
  JAM: { first: 'Andre Kemar Shamar Dwayne Leon Romario Jermaine Damion'.split(' '), last: 'Campbell Brown Grant Reid Francis McLeod Gayle Bailey'.split(' ') },
  FRA: { first: 'Lucas Hugo Theo Nathan Mathis Enzo Louis Antoine Maxime Yanis'.split(' '), last: 'Martin Bernard Dubois Moreau Laurent Girard Lefevre Fontaine Diallo Traore'.split(' ') },
  ESP: { first: 'Pablo Alvaro Diego Sergio Javier Adrian Hugo Marcos Iker Raul'.split(' '), last: 'Garcia Fernandez Lopez Martinez Sanchez Romero Navarro Ruiz Moreno Ortega'.split(' ') },
  POR: { first: 'Joao Tiago Rafael Diogo Goncalo Rui Andre Bruno'.split(' '), last: 'Silva Santos Ferreira Pereira Costa Oliveira Carvalho Gomes'.split(' ') },
  NED: { first: 'Daan Sem Luuk Milan Jesse Thijs Bram Lars'.split(' '), last: 'de Jong Jansen de Vries van Dijk Bakker Visser Smit Mulder'.split(' ') },
  BRA: { first: 'Gabriel Lucas Mateus Rafael Vinicius Thiago Bruno Felipe'.split(' '), last: 'Souza Lima Alves Ribeiro Rocha Barbosa Teixeira Moura'.split(' ') },
  ITA: { first: 'Lorenzo Matteo Alessandro Andrea Federico Davide Simone Riccardo Giorgio Nicolo'.split(' '), last: 'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo'.split(' ') },
  GER: { first: 'Lukas Leon Felix Jonas Niklas Tim Jan Paul'.split(' '), last: 'Muller Schmidt Schneider Fischer Weber Wagner Becker Hoffmann'.split(' ') },
  DEN: { first: 'Mads Rasmus Mikkel Jonas Frederik Kasper'.split(' '), last: 'Nielsen Jensen Hansen Pedersen Andersen Larsen'.split(' ') },
  GHA: { first: 'Kwame Kofi Yaw Kwabena Kojo Fiifi'.split(' '), last: 'Mensah Owusu Boateng Asante Appiah Ofori'.split(' ') },
  POL: { first: 'Jakub Kacper Mateusz Szymon Bartosz Kamil'.split(' '), last: 'Nowak Kowalski Wisniewski Wojcik Kaminski Lewandowski'.split(' ') },
};

/** Nationality mix by division (share of non-English players grows with level). */
export function nationalityWeights(div: number): [string, number][] {
  const foreign = div <= 1 ? 0.65 : div <= 2 ? 0.4 : div <= 4 ? 0.22 : div <= 6 ? 0.12 : 0.06;
  const home = 1 - foreign;
  return [
    ['ENG', home * 0.86], ['SCO', home * 0.05], ['WAL', home * 0.04], ['IRL', home * 0.05],
    ['NGA', foreign * 0.12], ['JAM', foreign * 0.1], ['FRA', foreign * 0.14], ['ESP', foreign * 0.1], ['POR', foreign * 0.08],
    ['NED', foreign * 0.08], ['BRA', foreign * 0.1], ['GER', foreign * 0.07], ['DEN', foreign * 0.07], ['GHA', foreign * 0.07], ['POL', foreign * 0.07],
  ];
}

export const SPONSOR_NAMES = 'Arrow Logistics|Brightside Energy|Crownline Insurance|Dale & Sons Builders|Eastgate Motors|Fenwick Bakery|Greenway Homes|Harbour Print|Ironbridge Tools|Jubilee Taxis|Keystone Accountants|Lakeside Caravans|Meridian Telecom|Northstar Bank|Oakfield Dairy|Pennine Brewery|Quayside Fish Bar|Redline Scaffolding|Summit Fitness|Tidal Windows|Unity Credit Union|Vanguard Security|Westfield Garden Centre|Yardley Plumbing|Zenith Electrical|Coastline Coaches|Silverleaf Solar|Bluebell Care Homes|Atlas Freight|Kingfisher Pubs'.split('|');
