/*
 * What fetch.js downloads. Each Wikidata job returns one row per item: id (QID), English label, English
 * aliases (alts, '|'-separated), sitelink count (sl: how many Wikipedias have an article) and the English
 * Wikipedia title (en), plus any extra fields. build.js decides which bank list each job feeds.
 * Keep queries small: the public endpoint stops a query after 60 s and slows down clients whose queries time out.
 */
'use strict';
const V = a => a.map(q => 'wd:' + q).join(' ');
const HEAD = '?item ?sl ?label ?en (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts)';
const TAIL = `?item wikibase:sitelinks ?sl . FILTER(?sl >= MIN)
  ?item rdfs:label ?label . FILTER(lang(?label)="en")
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(lang(?alt)="en") }
  OPTIONAL { ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }`;
// things: items that are an instance (or kind) of one of the classes.
//   how: 'inst' P31, 'sub' P279, 'both' P31 or P279, 'deep' P31/P279 then any number of P279 steps.
function things(id, classes, min, how, extra, extraVars) {
  const path = { inst: 'wdt:P31', sub: 'wdt:P279', both: 'wdt:P31|wdt:P279', deep: '(wdt:P31|wdt:P279)/wdt:P279*' }[how || 'inst'];
  const ev = extraVars || '';
  return { id, q: `SELECT ${HEAD} ${ev} WHERE { VALUES ?cls { ${V(classes)} } ?item ${path} ?cls .
  ${TAIL.replace('MIN', min)} ${extra || ''} } GROUP BY ?item ?sl ?label ?en` };
}
// people: humans with one of the occupations, leaving out anyone Wikidata lists as convicted of a crime.
function people(id, occs, min) {
  return { id, q: `SELECT ${HEAD} (SAMPLE(?fl) AS ?fam) WHERE { VALUES ?occ { ${V(occs)} } ?item wdt:P106 ?occ; wdt:P31 wd:Q5 .
  ${TAIL.replace('MIN', min)} FILTER NOT EXISTS { ?item wdt:P1399 ?crime }
  OPTIONAL { ?item wdt:P734 ?f . ?f rdfs:label ?fl . FILTER(lang(?fl)="en") } } GROUP BY ?item ?sl ?label ?en` };
}
const jobs = [
  { id: 'taxa' },
  // ---------------------------------------------------------------- geography
  things('countries', ['Q3624078', 'Q6256'], 40, 'inst', 'OPTIONAL { ?item wdt:P30 ?cont }', '(GROUP_CONCAT(DISTINCT ?cont; separator="|") AS ?conts)'),
  things('rivers', ['Q4022'], 14),
  things('mountains', ['Q8502'], 14),
  things('ranges', ['Q46831'], 10),
  things('volcanoes', ['Q8072', 'Q169358', 'Q190869', 'Q212057', 'Q332614', 'Q1371468', 'Q213397'], 6),
  things('lakes', ['Q23397'], 18),
  things('islands', ['Q23442', 'Q33837'], 18),
  things('deserts', ['Q8514'], 5),
  things('languages', ['Q34770', 'Q1288568', 'Q33742', 'Q20162172', 'Q45762'], 25),
  things('currencies', ['Q8142'], 10),
  things('seas', ['Q165', 'Q1322134', 'Q39594', 'Q37901', 'Q9430', 'Q1210950'], 15),
  things('nationalparks', ['Q46169'], 15),
  things('bridges', ['Q12280', 'Q158218', 'Q537127', 'Q158555'], 25),
  // ---------------------------------------------------------------- animals (breeds; wild animals come from taxa)
  things('dogs', ['Q39367'], 3),
  things('cats', ['Q43577'], 3),
  // ---------------------------------------------------------------- food
  things('cheeses', ['Q10943'], 3, 'both'),
  things('breads', ['Q7802'], 4, 'both'),
  things('pasta', ['Q178'], 3, 'both'),
  things('desserts', ['Q182940', 'Q13276', 'Q13266', 'Q477248', 'Q13360264', 'Q189175', 'Q1189163', 'Q815290', 'Q1076846'], 4, 'both'),
  things('soups', ['Q41415'], 4, 'both'),
  things('sauces', ['Q178359', 'Q2596997'], 4, 'both'),
  things('sandwiches', ['Q28803'], 4, 'both'),
  things('salads', ['Q9266'], 4, 'both'),
  things('dishes', ['Q746549', 'Q2095'], 8, 'inst', 'OPTIONAL { ?item wdt:P495 ?origin } OPTIONAL { ?item wdt:P2012 ?cuisine }', '(GROUP_CONCAT(DISTINCT ?origin; separator="|") AS ?origins) (GROUP_CONCAT(DISTINCT ?cuisine; separator="|") AS ?cuisines)'),
  things('candy', ['Q1056344', 'Q185583', 'Q195', 'Q131419', 'Q2914'], 4, 'both'),
  things('cereal', ['Q2012755'], 2, 'both'),
  things('fastfood', ['Q1751429', 'Q18534', 'Q5307737'], 8, 'inst'),
  things('softdrinks', ['Q147538', 'Q1062767', 'Q2729467'], 5, 'both'),
  // ---------------------------------------------------------------- pop culture
  things('videogames', ['Q7889'], 22, 'inst', 'OPTIONAL { ?item wdt:P852 ?esrb } OPTIONAL { ?item wdt:P908 ?pegi }', '(GROUP_CONCAT(DISTINCT ?esrb; separator="|") AS ?esrbs) (GROUP_CONCAT(DISTINCT ?pegi; separator="|") AS ?pegis)'),
  things('films', ['Q11424', 'Q29168811', 'Q24869'], 45, 'inst', 'OPTIONAL { ?item wdt:P1657 ?mpa } OPTIONAL { ?item wdt:P136 ?genre }', '(GROUP_CONCAT(DISTINCT ?mpa; separator="|") AS ?mpas) (GROUP_CONCAT(DISTINCT ?genre; separator="|") AS ?genres)'),
  things('superheroes', ['Q188784', 'Q1114461'], 12, 'inst', 'FILTER EXISTS { ?item wdt:P2283|wdt:P1080|wdt:P31 ?x }'),
  things('vgchars', ['Q1569167'], 10),
  things('animchars', ['Q15711870', 'Q15773347'], 10),
  things('boardgames', ['Q131436'], 5),
  things('cardgames', ['Q142714'], 5),
  things('genres', ['Q188451'], 15),
  people('painters', ['Q1028181'], 40),
  people('composers', ['Q36834'], 40),
  people('scientists', ['Q169470', 'Q593644', 'Q864503', 'Q170790', 'Q11063', 'Q205375', 'Q901', 'Q350979', 'Q520549', 'Q2374149'], 50),
  people('mathematicians', ['Q170790'], 35),
  people('astronauts', ['Q11631'], 12),
  people('athletes', ['Q937857', 'Q3665646', 'Q10871364', 'Q19204627', 'Q11774891', 'Q10833314', 'Q11513337', 'Q10843402', 'Q11338576', 'Q378622', 'Q11303721', 'Q12299841', 'Q16029547', 'Q13381376', 'Q2066131'], 70),
  things('deities', ['Q178885', 'Q22989102', 'Q11688446', 'Q24249', 'Q16513881', 'Q205985'], 10, 'both'),
  things('creatures', ['Q2239243'], 10, 'deep'),
  things('musicals', ['Q2743'], 8),
  things('toys', ['Q11422'], 6, 'both'),
  things('dances', ['Q11639', 'Q1792379'], 8, 'both'),
  things('bands', ['Q215380', 'Q5741069', 'Q216337'], 45),
  things('pokemon', ['Q3966183'], 1),
  things('consoles', ['Q8076', 'Q941818', 'Q1057259'], 5),
  things('fairytales', ['Q699'], 8),
  things('paintings', ['Q3305213'], 30),
  things('theorems', ['Q65943'], 8),
  things('phobias', ['Q175854'], 5),
  things('chessopenings', ['Q103632'], 5, 'both'),
  things('typefaces', ['Q17451'], 5),
  things('rollercoasters', ['Q204832'], 4),
  things('themeparks', ['Q194195', 'Q2416723'], 10),
  // ---------------------------------------------------------------- science
  things('minerals', ['Q12089225'], 8),
  things('rocktypes', ['Q8063'], 8, 'both'),
  things('gems', ['Q83437'], 4, 'both'),
  things('diseases', ['Q12136', 'Q18123741', 'Q929833', 'Q18965518'], 45),
  things('units', ['Q47574', 'Q1790144', 'Q1978718'], 10),
  things('moons', ['Q2537', 'Q1086783'], 3, 'inst', 'OPTIONAL { ?item wdt:P397 ?parent }', '(SAMPLE(?parent) AS ?par)'),
  things('spacecraft', ['Q26529', 'Q148578', 'Q40218', 'Q752783', 'Q41291', 'Q697175', 'Q2133344'], 14),
  things('proglangs', ['Q9143', 'Q21562092', 'Q12772052', 'Q28922885', 'Q899523'], 8),
  things('compounds', ['Q11173'], 60),
  things('bones', ['Q265868', 'Q55788864'], 5, 'both'),
  things('muscles', ['Q7365', 'Q4936952'], 5, 'both'),
  // ---------------------------------------------------------------- sports
  things('sports', ['Q349', 'Q31629', 'Q2755547', 'Q216048', 'Q1914636', 'Q13406554'], 12, 'both'),
  things('soccerclubs', ['Q476028', 'Q103229495'], 22),
  things('stadiums', ['Q483110', 'Q1076486', 'Q641226'], 22),
  things('martialarts', ['Q11420'], 8, 'both'),
  // ---------------------------------------------------------------- everyday life
  things('jobs', ['Q28640', 'Q12737077'], 25),
  things('instruments', ['Q34379', 'Q1798603', 'Q173453', 'Q133163', 'Q52954', 'Q181247', 'Q2140028', 'Q1254773'], 6, 'both'),
  things('carbrands', ['Q786820', 'Q4830453'], 12, 'inst', 'FILTER EXISTS { ?item wdt:P452 wd:Q190117 }'),
  things('carmodels', ['Q3231690', 'Q59773381'], 12),
  things('colors', ['Q1075'], 5),
  things('clothing', ['Q11460', 'Q80151', 'Q22676'], 8, 'sub'),
  things('furniture', ['Q14745'], 8, 'sub'),
  things('tools', ['Q39546', 'Q1501161'], 10, 'sub'),
  things('holidays', ['Q1445650', 'Q1197685', 'Q2558684', 'Q15275719'], 15),
  things('boynames', ['Q12308941'], 25),
  things('girlnames', ['Q11879590'], 25),
  things('emotions', ['Q9415'], 10, 'sub'),
  things('buildings', ['Q41176'], 15, 'sub'),
  things('vehicles', ['Q42889', 'Q1420', 'Q11446', 'Q197', 'Q870'], 15, 'sub'),
  things('hats', ['Q80151'], 5, 'sub'),
  things('knots', ['Q1076532', 'Q1361838'], 3, 'both'),
  things('ships', ['Q11446', 'Q2811', 'Q17205', 'Q174736', 'Q182531', 'Q170013'], 30, 'inst'),
  things('colleges', ['Q3918', 'Q189004', 'Q23002054', 'Q902104'], 18, 'inst', '?item wdt:P17 wd:Q30 .'),
  // ---------------------------------------------------------------- word data (not Wikidata)
  { id: 'gwordlist', url: 'https://raw.githubusercontent.com/hackerb9/gwordlist/master/frequency-alpha-alldicts.txt', file: 'gw.txt' },
  // places: GeoNames (CC BY 4.0), towns and cities of 5,000 people or more, with their other names
  { id: 'geonames', url: 'https://download.geonames.org/export/dump/cities5000.zip', file: 'cities5000.zip' },
  { id: 'geonames_admin1', url: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt', file: 'admin1.txt' },
  { id: 'linguabase', url: 'https://huggingface.co/datasets/linguabase/linguabase/resolve/main/vocabulary/vocabulary.core.tsv.gz', file: 'lb_vocab_core.tsv.gz' },
];
module.exports = { jobs };
