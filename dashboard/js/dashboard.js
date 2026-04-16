// ============================================================
// ERA-SALES DASHBOARD — Main Dashboard Logic
// ============================================================

// ─── TSH STORE DATA (Drill-Down) ─────────────────────────────
const TSH_STORE_DATA = {
  "ABDILLAH": [
    { code: "G402", name: "ERABLUE HOS COKROAMINOTO CILEDUG", ach: 0 },
    { code: "E231", name: "ERAFONE RUKO HOS COKROAMINOTO", ach: 0 },
    { code: "E646", name: "ERAFONE BATU CEPER", ach: 0 },
    { code: "G401", name: "ERABLUE RADEN SALEH CILEDUG", ach: 0 },
    { code: "M021", name: "ERAFONE & MORE RUKO CILEDUG", ach: 0 },
    { code: "M093", name: "MEGASTORE RUKO CIPONDOH TANGERANG", ach: 0 },
    { code: "E290", name: "ERAFONE RUKO PORIS TANGERANG", ach: 0 },
    { code: "G380", name: "HYPERMART CILEDUG", ach: 0 },
    { code: "F003", name: "ERAFONE 2.5 CILEDUG RAYA", ach: 0 },
    { code: "G416", name: "ERABLUE RADEN FATAH CILEDUG", ach: 0 },
    { code: "G487", name: "ERABLUE MAULANA HASANUDIN TANGERANG", ach: 0 },
    { code: "G546", name: "ERABLUE CILEDUG RAYA TANGERANG", ach: 0 }
  ],
  "ANDRY UTAMA": [
    { code: "X016", name: "IBOX MALL ATRIUM SENEN", ach: 0 },
    { code: "X022", name: "IBOX FLAGSHIP SENAYAN CITY", ach: 0 },
    { code: "X014", name: "IBOX MENTENG CENTRAL", ach: 0 },
    { code: "X015", name: "IBOX PLAZA INDONESIA", ach: 0 },
    { code: "X037", name: "IBOX MANGGA DUA", ach: 0 },
    { code: "X172", name: "IBOX SENAYAN PARK", ach: 0 },
    { code: "X192", name: "IBOX (AAR) MENARA JAKARTA", ach: 0 }
  ],
  "ARDILESACH": [
    { code: "X064", name: "IBOX MALL CITRARAYA", ach: 0 },
    { code: "X049", name: "IBOX CILEGON CENTRE", ach: 0 },
    { code: "X072", name: "IBOX LIVING WORLD ALAM SUTRA", ach: 0 },
    { code: "X142", name: "IBOX A YANI SERANG", ach: 0 },
    { code: "X173", name: "IBOX MALL ALAM SUTERA", ach: 0 },
    { code: "X168", name: "IBOX BINTARO XCHANGE MALL II", ach: 0 },
    { code: "X190", name: "IBOX GREENLAKE", ach: 0 }
  ],
  "ARENGGA": [
    { code: "G403", name: "ERABLUE DEWI SARTIKA CIPUTAT", ach: 0 },
    { code: "E043", name: "ERAFONE PLAZA BINTARO JAYA", ach: 0 },
    { code: "E160", name: "ERAFONE RUKO CEGER TANGERANG", ach: 0 },
    { code: "E321", name: "ERAFONE RUKO SUDIMARA", ach: 0 },
    { code: "E391", name: "ERAFONE RUKO SUPRATMAN CIPUTAT", ach: 0 },
    { code: "E612", name: "ERAFONE RUKO JOMBANG", ach: 0 },
    { code: "E704", name: "ERAFONE MB KH DEWANTARA CIPUTAT", ach: 0 },
    { code: "E685", name: "ERAFONE MB PONDOK BETUNG", ach: 0 },
    { code: "M014", name: "ERAFONE AND MORE BINTARO X-CHANGE", ach: 0 },
    { code: "M027", name: "ERAFONE & MORE RUKO CIPUTAT", ach: 0 },
    { code: "Q109", name: "XLC HYBRID BINTARO JAYA XCHANGE", ach: 0 },
    { code: "E299", name: "ERAFONE RUKO CIRENDEU", ach: 0 },
    { code: "M104", name: "MEGASTORE RUKO REMPOA CIPUTAT", ach: 0 },
    { code: "E620", name: "ERAFONE 2.5 PADJAJARAN PAMULANG", ach: 0 },
    { code: "G423", name: "ERABLUE PARUNG CIPUTAT", ach: 0 },
    { code: "G427", name: "ERABLUE CIRENDEU TANGERANG SELATAN", ach: 0 },
    { code: "G457", name: "ERABLUE CEGER RAYA TANGERANG", ach: 0 },
    { code: "F077", name: "ERAFONE BINTARO EXCHANGE II", ach: 0 },
    { code: "G520", name: "ERABLUE PAHLAWAN REMPOA", ach: 0 },
    { code: "G584", name: "ERABLUE WR SUPRATMAN TANGSEL", ach: 0 },
    { code: "G586", name: "ERABLUE MALIOBORO KALIDERES", ach: 0 }
  ],
  "ARI HIDAYAT": [
    { code: "E251", name: "ERAFONE RUKO CIMONE TANGERANG", ach: 0 },
    { code: "M061", name: "ERAFONE & MORE RUKO JATIUWUNG", ach: 0 },
    { code: "E684", name: "ERAFONE MB SANGIANG", ach: 0 },
    { code: "E714", name: "ERAFONE MB JATAKE", ach: 0 },
    { code: "E370", name: "ERAFONE RUKO BERINGIN", ach: 0 },
    { code: "E417", name: "ERAFONE RUKO HASYIM ASYARI CILEDUG", ach: 0 },
    { code: "E422", name: "ERAFONE RUKO MOH TOHA TANGERANG", ach: 0 },
    { code: "E696", name: "ERAFONE MB RASUNA SAID", ach: 0 },
    { code: "E369", name: "ERAFONE RUKO BOROBUDUR", ach: 0 },
    { code: "E119", name: "ERAFONE TANGERANG CITY MALL", ach: 0 },
    { code: "Q129", name: "XLC TANGERANG CITY MALL", ach: 0 },
    { code: "M176", name: "ERAFONE & MORE KISAMAUN", ach: 0 },
    { code: "G444", name: "ERABLUE MOH. TOHA TANGERANG", ach: 0 },
    { code: "G458", name: "ERABLUE KH HASYIM ASHARI TANGERANG", ach: 0 },
    { code: "G508", name: "ERABLUE TAMAN CIBODAS TANGERANG", ach: 0 }
  ],
  "EKA FUJI CHAERUL ANWAR": [
    { code: "E834", name: "ERAFONE KEDAUNG TANGSEL", ach: 0 },
    { code: "G404", name: "ERABLUE RAWA BUNTU SERPONG", ach: 0 },
    { code: "G405", name: "ERABLUE SILIWANGI PAMULANG", ach: 0 },
    { code: "E082", name: "ERAFONE LIVING WORLD ALAM SUTERA", ach: 0 },
    { code: "E087", name: "ERAFONE ITC BSD", ach: 0 },
    { code: "E191", name: "ERAFONE RUKO SURYA KENCANA PAMULANG", ach: 0 },
    { code: "E245", name: "ERAFONE RUKO BENDA RAYA PAMULANG", ach: 0 },
    { code: "E484", name: "ERAFONE SERPONG PARADISE WALK", ach: 0 },
    { code: "E586", name: "ERAFONE RUKO GRAHA RAYA", ach: 0 },
    { code: "E705", name: "ERAFONE MB CIATER TANGSEL", ach: 0 },
    { code: "E088", name: "ERAFONE AEON MAL BSD CITY", ach: 0 },
    { code: "E941", name: "ERAFONE MB RAYA SERPONG", ach: 0 },
    { code: "F022", name: "ERAFONE 2.5 PAMULANG", ach: 0 },
    { code: "G443", name: "ERABLUE SETIA BUDI PAMULANG", ach: 0 },
    { code: "G445", name: "ERABLUE PUSPITEK SERPONG", ach: 0 },
    { code: "G480", name: "ERABLUE BENDA PERMAI PAMULANG", ach: 0 }
  ],
  "FEBRIAN TRI WIBOWO": [
    { code: "E413", name: "ERAFONE RUKO KEDOYA", ach: 0 },
    { code: "E465", name: "ERAFONE RUKO KEBAYORAN LAMA", ach: 0 },
    { code: "E582", name: "ERAFONE RUKO SRENGSENG", ach: 0 },
    { code: "E875", name: "ERAFONE MB POS PENGUMBEN", ach: 0 },
    { code: "E028", name: "ERAFONE MAL PURI INDAH", ach: 0 },
    { code: "E029", name: "ERAFONE LIPPO MALL PURI", ach: 0 },
    { code: "E322", name: "ERAFONE RUKO MERUYA", ach: 0 },
    { code: "E679", name: "ERAFONE MB JOGLO RAYA", ach: 0 },
    { code: "E514", name: "ERAFONE MERUYA SELATAN", ach: 0 },
    { code: "Q108", name: "GERAI ISAT OOREDOO LIPPO MALL PURI", ach: 0 },
    { code: "Q022", name: "XLC MAL PURI INDAH", ach: 0 },
    { code: "E923", name: "ERAFONE MB JALAN PANJANG", ach: 0 },
    { code: "E942", name: "ERAFONE MB KEMBANGAN UTARA", ach: 0 },
    { code: "E943", name: "ERAFONE MB TAMAN RATU", ach: 0 },
    { code: "E616", name: "ERAFONE 2.5 MERUYA ILIR", ach: 0 },
    { code: "G417", name: "ERABLUE MERUYA SELATAN", ach: 0 },
    { code: "M219", name: "ERAFONE & MORE PURI INDAH MALL 2", ach: 0 },
    { code: "G532", name: "ERABLUE KAMPUNG KECIL JAKBAR", ach: 0 }
  ],
  "IRMAN PERMANA": [
    { code: "E027", name: "ERAFONE DAAN MOGOT MALL", ach: 0 },
    { code: "E215", name: "ERAFONE GREEN SEDAYU MALL", ach: 0 },
    { code: "E381", name: "ERAFONE RUKO PETA BARAT JAKBAR", ach: 0 },
    { code: "E453", name: "ERAFONE RUKO DURI KOSAMBI", ach: 0 },
    { code: "M068", name: "ERAFONE & MORE RUKO KAMAL CENGKARENG", ach: 0 },
    { code: "E233", name: "ERAFONE RUKO TAMAN SURYA JAKBAR", ach: 0 },
    { code: "E312", name: "ERAFONE KRESEK KOSAMBI", ach: 0 },
    { code: "E960", name: "ERAFONE MB MENCENG RAYA", ach: 0 },
    { code: "E992", name: "ERAFONE 2.5 KAPUK CENGKARENG", ach: 0 },
    { code: "G437", name: "ERABLUE SATU MARET JAKBAR", ach: 0 },
    { code: "G435", name: "ERABLUE DURI KOSAMBI JAKBAR", ach: 0 }
  ],
  "JOKO SUPRASTIO": [
    { code: "X012", name: "IBOX FLAGSHIP CENTRAL PARK", ach: 0 },
    { code: "X055", name: "IBOX MAL CIPUTRA JAKARTA", ach: 0 },
    { code: "X011", name: "IBOX LIPPO MALL PURI", ach: 0 },
    { code: "X043", name: "IBOX ITC ROXY", ach: 0 },
    { code: "X110", name: "IBOX GAJAH MADA MALL", ach: 0 }
  ],
  "LIA ASTUTI": [
    { code: "S018", name: "SES SENAYAN CITY", ach: 0 },
    { code: "S049", name: "SPS ITC CEMPAKA MAS", ach: 0 },
    { code: "S055", name: "SES PLAZA SENAYAN", ach: 0 },
    { code: "S058", name: "SES GREEN PRAMUKA SQUARE", ach: 0 },
    { code: "S098", name: "SES SENAYAN PARK MALL", ach: 0 },
    { code: "S142", name: "SES CENTRAL PARK", ach: 0 },
    { code: "S015", name: "SAMSUNG LIPPO MALL PURI", ach: 0 },
    { code: "S044", name: "SES 2 ITC ROXY MAS", ach: 0 },
    { code: "S195", name: "SAMSUNG (SES) MENARA JAKARTA", ach: 0 },
    { code: "S194", name: "SAMSUNG (SPS) AGORA THAMRIN NINE", ach: 0 },
    { code: "S228", name: "SES CIPUTRA MALL JKT", ach: 0 },
    { code: "S230", name: "SES MALL TAMAN ANGGREK", ach: 0 },
    { code: "S231", name: "SES PLAZA INDONESIA", ach: 0 },
    { code: "S229", name: "SES GRAND INDONESIA EAST MALL", ach: 0 }
  ],
  "LIM PING KIAN": [
    { code: "S041", name: "SES BINTARO X CHANGE", ach: 0 },
    { code: "S097", name: "SES MALL CIPUTRA CITRA RAYA TANGERANG", ach: 0 },
    { code: "S066", name: "SES CILEGON CENTER MALL", ach: 0 },
    { code: "S136", name: "SPS LABUAN PANDEGLANG", ach: 0 },
    { code: "S137", name: "SPS A YANI CILEGON", ach: 0 },
    { code: "S158", name: "SAMSUNG (SEP) SERPONG PARADISE WALK", ach: 0 },
    { code: "S056", name: "SES SUMMARECON MAL SERPONG", ach: 0 },
    { code: "S042", name: "SES AEON MAL BSD CITY", ach: 0 },
    { code: "S040", name: "SES TANGERANG CITY MALL", ach: 0 },
    { code: "S190", name: "SAMSUNG BINTARO XCHANGE MALL II", ach: 0 },
    { code: "S201", name: "SAMSUNG HAMPTON SQUARE SERPONG", ach: 0 }
  ],
  "LUKMAN WIBOWO": [
    { code: "E038", name: "ERAFONE MALL ATRIUM SENEN", ach: 0 },
    { code: "E047", name: "ERAFONE 1 ITC CEMPAKA MAS", ach: 0 },
    { code: "E137", name: "ERAFONE GREEN PRAMUKA SQUARE", ach: 0 },
    { code: "E414", name: "ERAFONE RUKO PERCETAKAN NEGARA", ach: 0 },
    { code: "E663", name: "ERAFONE GARUDA KEMAYORAN", ach: 0 },
    { code: "E408", name: "ERAFONE RUKO SUMUR BATU", ach: 0 },
    { code: "G258", name: "LOTTEMART GREEN PRAMUKA CITY", ach: 0 },
    { code: "E113", name: "ERAFONE GRAND INDONESIA", ach: 0 },
    { code: "E732", name: "ERAFONE SABANG JAKPUS", ach: 0 },
    { code: "Q104", name: "XLC GRAND INDONESIA", ach: 0 },
    { code: "M212", name: "ERAFONE & MORE RAWASARI", ach: 0 },
    { code: "F080", name: "ERAFONE MENARA JAKARTA", ach: 0 }
  ],
  "MENSI ALEXANDER": [
    { code: "E216", name: "ERAFONE SENAYAN PARK MALL", ach: 0 },
    { code: "E281", name: "ERAFONE SENAYAN CITY 3.0", ach: 0 },
    { code: "E037", name: "ERAFONE GAJAH MADA PLAZA", ach: 0 },
    { code: "E096", name: "ERAFONE 2 ITC ROXY MAS", ach: 0 },
    { code: "E396", name: "ERAFONE & MORE RUKO ITC ROXY MAS", ach: 0 },
    { code: "E678", name: "ERAFONE MB BENDUNGAN HILIR", ach: 0 },
    { code: "E682", name: "ERAFONE MB KH MANSYUR TANAH ABANG", ach: 0 },
    { code: "Q002", name: "GALERI ISAT KPPTI", ach: 0 },
    { code: "Q012", name: "GALERI ISAT MANGGA DUA", ach: 0 },
    { code: "E898", name: "ERAFONE MB SAMANHUDI", ach: 0 },
    { code: "Q248", name: "XLC ITC ROXY MAS", ach: 0 },
    { code: "G493", name: "AGRES MANGGA DUA SQUARE", ach: 0 },
    { code: "F073", name: "ERAFONE AGORA MALL", ach: 0 }
  ],
  "NURUL ZAMAN": [
    { code: "E081", name: "ERAFONE MALL OF SERANG", ach: 0 },
    { code: "E150", name: "ERAFONE CILEGON CENTER MALL", ach: 0 },
    { code: "E194", name: "ERAFONE RUKO RANGKASBITUNG", ach: 0 },
    { code: "E209", name: "ERAFONE RUKO AHMAD YANI SERANG", ach: 0 },
    { code: "E308", name: "ERAFONE RUKO MAYOR SAFEI", ach: 0 },
    { code: "E320", name: "ERAFONE RUKO PANDEGLANG", ach: 0 },
    { code: "E499", name: "ERAFONE LABUAN", ach: 0 },
    { code: "E544", name: "ERAFONE CILEGON", ach: 0 },
    { code: "E589", name: "ERAFONE RUKO PANIMBANG", ach: 0 },
    { code: "E822", name: "ERAFONE MB KRAGILAN", ach: 0 },
    { code: "E821", name: "ERAFONE MB ANYER", ach: 0 },
    { code: "E833", name: "ERAFONE RUKO RANGKASBITUNG 2", ach: 0 },
    { code: "E879", name: "ERAFONE MB CIPARE", ach: 0 },
    { code: "G470", name: "ERABLUE LINGKAR SELATAN SERANG", ach: 0 },
    { code: "G622", name: "ERABLUE WARUNG JAUD SERANG", ach: 0 }
  ],
  "RENDI JANUARDI": [
    { code: "E201", name: "ERAFONE RUKO KRESEK BALARAJA", ach: 0 },
    { code: "E221", name: "ERAFONE AND MORE CIPUTRA CITRA RAYA", ach: 0 },
    { code: "E253", name: "ERAFONE RUKO CURUG TANGERANG", ach: 0 },
    { code: "E744", name: "ERAFONE MB RAJEK", ach: 0 },
    { code: "M048", name: "MEGASTORE RUKO CIKUPA", ach: 0 },
    { code: "E812", name: "ERAFONE MB KUTABUMI", ach: 0 },
    { code: "E787", name: "ERAFONE MB RUKOTIGARAKSA", ach: 0 },
    { code: "E627", name: "ERAFONE RUKO CISOKA", ach: 0 },
    { code: "E848", name: "ERAFONE PASAR KEMIS", ach: 0 },
    { code: "G377", name: "HYPERMART CITRA RAYA CIKUPA", ach: 0 },
    { code: "E695", name: "ERAFONE MB BINONG", ach: 0 },
    { code: "M167", name: "ERAFONE & MORE TELUK NAGA", ach: 0 },
    { code: "F058", name: "ERAFONE 2.5 TELAGA BESTARI", ach: 0 },
    { code: "G420", name: "ERABLUE KUTABUMI TANGERANG", ach: 0 },
    { code: "G446", name: "ERABLUE CIKUPA PEUSAR", ach: 0 },
    { code: "G447", name: "ERABLUE CURUG RAYA TANGERANG", ach: 0 },
    { code: "G451", name: "ERABLUE CISOKA TIGARAKSA TANGERANG", ach: 0 },
    { code: "G453", name: "ERABLUE SYEH MUBAROK TANGERANG", ach: 0 },
    { code: "F066", name: "ERAFONE 2.5 SEPATAN", ach: 0 },
    { code: "G464", name: "ERABLUE MAUK TANGERANG", ach: 0 },
    { code: "G467", name: "ERABLUE KRESEK BALARAJA", ach: 0 },
    { code: "G478", name: "ERABLUE PASAR KEMIS TANGERANG", ach: 0 },
    { code: "G489", name: "ERABLUE KAMPUNG MELAYU TANGERANG", ach: 0 },
    { code: "G494", name: "ERABLUE KRONJO TANGERANG", ach: 0 },
    { code: "F079", name: "ERAFONE 2.5 GRAND BATAVIA", ach: 0 },
    { code: "G497", name: "ERABLUE KRESEK SUKAMULYA", ach: 0 },
    { code: "G505", name: "ERABLUE MAUK JATIWARINGIN TGR", ach: 0 },
    { code: "G569", name: "ERABLUE MAUK SUKAMANAH TGR", ach: 0 }
  ],
  "RENDY NUR SETIAWAN": [
    { code: "E158", name: "ERAFONE MAL CIPUTRA JAKARTA", ach: 0 },
    { code: "E164", name: "ERAFONE MAL TAMAN ANGGREK", ach: 0 },
    { code: "E172", name: "ERAFONE RUKO KEBON JERUK BINUS", ach: 0 },
    { code: "E664", name: "ERAFONE TANJUNG DUREN", ach: 0 },
    { code: "M091", name: "MEGASTORE CENTRAL PARK 3.0", ach: 0 },
    { code: "Q008", name: "XLC CENTRAL PARK", ach: 0 },
    { code: "E508", name: "ERAFONE JEMBATAN LIMA", ach: 0 },
    { code: "E593", name: "ERAFONE RUKO MANGGA BESAR", ach: 0 },
    { code: "E991", name: "ERAFONE 2.5 KEMANGGISAN UTAMA RAYA", ach: 0 },
    { code: "E986", name: "ERAFONE MB JEMBATAN BESI", ach: 0 },
    { code: "G519", name: "ERABLUE RAWA BELONG JAKBAR", ach: 0 },
    { code: "F134", name: "ERAFONE MALL CIPUTRA 2.5 JAKARTA", ach: 0 }
  ],
  "RIZKY KURNIAWAN": [
    { code: "X033", name: "IBOX BINTARO PLAZA", ach: 0 },
    { code: "X034", name: "IBOX - SDC SERPONG", ach: 0 },
    { code: "X035", name: "IBOX FLAGSHIP SUMMARECON MALL SERPONG", ach: 0 },
    { code: "X058", name: "IBOX TANGERANG CITY MALL", ach: 0 },
    { code: "X191", name: "IBOX PARAMOUNT BSD", ach: 0 },
    { code: "X222", name: "IBOX PAMULANG", ach: 0 }
  ],
  "SANDI MAULANA": [
    { code: "M019", name: "MEGASTORE SUMMARECON MALL SERPONG", ach: 0 },
    { code: "E259", name: "ERAFONE RUKO KELAPA DUA TANGERANG", ach: 0 },
    { code: "E777", name: "ERAFONE CIHUNI GADING SERPONG", ach: 0 },
    { code: "E084", name: "ERAFONE 1 SUPERMALL KARAWACI", ach: 0 },
    { code: "M013", name: "MEGASTORE SUPERMAL KARAWACI", ach: 0 },
    { code: "E813", name: "ERAFONE MB SERPONG GARDEN CISAUK", ach: 0 },
    { code: "E874", name: "ERAFONE MB DASANA INDAH", ach: 0 },
    { code: "E873", name: "ERAFONE MB LEGOK", ach: 0 },
    { code: "Q024", name: "GALERI ISAT KARAWACI TANGERANG", ach: 0 },
    { code: "M163", name: "ERAFONE & MORE SERPONG", ach: 0 },
    { code: "G431", name: "ERABLUE LEGOK TANGERANG", ach: 0 },
    { code: "G463", name: "ERABLUE KANO RAYA TANGERANG", ach: 0 },
    { code: "G468", name: "ERABLUE LEGOK KARAWACI", ach: 0 },
    { code: "M222", name: "ERAFONE & MORE EASTVARA MALL", ach: 0 }
  ],
  "SOPIYAN SAURI": [
    { code: "N183", name: "XIAOMI STORE BINTARO XCHANGE", ach: 0 },
    { code: "N216", name: "MI STORE CIPUTRA CITRARAYA", ach: 0 },
    { code: "N140", name: "XIAOMI STORE CILEGON CENTER MALL", ach: 0 },
    { code: "N075", name: "HUAWEI EXP SHOP MALL TAMAN ANGGREK", ach: 0 },
    { code: "N184", name: "XIAOMI STORE CENTRAL PARK", ach: 0 },
    { code: "N144", name: "MI STORE LIPPO MALL PURI", ach: 0 },
    { code: "N186", name: "XIAOMI STORE LIVING WORLD ALAM SUTERA", ach: 0 },
    { code: "N125", name: "HUAWEI EXP SHOP SUMMARECON MALL SERPONG", ach: 0 },
    { code: "N200", name: "XIAOMI STORE 1 SUMMARECON MAL", ach: 0 },
    { code: "N130", name: "XIAOMI STORE E-CENTER SUPERMAL KARAWACI", ach: 0 },
    { code: "N131", name: "XIAOMI STORE AEON MAL BSD CITY", ach: 0 },
    { code: "N191", name: "XIAOMI STORE TANG CITY", ach: 0 },
    { code: "N330", name: "HUAWEI PURI INDAH MALL", ach: 0 },
    { code: "N337", name: "HONOR BINTARO XCHANGE MALL", ach: 0 },
    { code: "N354", name: "XIAOMI MENARA JAKARTA", ach: 0 },
    { code: "N360", name: "HUAWEI MENARA JAKARTA", ach: 0 },
    { code: "N326", name: "MI STORE MALL MATAHARI DAAN MOGOT", ach: 0 },
    { code: "N380", name: "MI-STORE PLAZA BINTARO JAYA", ach: 0 },
    { code: "N391", name: "HUAWEI CENTRAL PARK MALL", ach: 0 },
    { code: "N394", name: "XIAOMI STORE GRAND INDONESIA", ach: 0 }
  ]
};

let activeTshDrilldown = null; // tracks which TSH panel is open

let allRecords  = [];
let userProfile = null;
let activeLob   = 'SEMUA';

document.addEventListener('DOMContentLoaded', async () => {
  // Pastikan Supabase client sudah siap
  await new Promise(r => setTimeout(r, 100));

  // Tidak perlu login — dashboard bisa diakses siapa saja
  initBottomNav();
  initDesktopNav();

  await loadDashboardData();
});

// ─── LOAD DATA ───────────────────────────────────────────────
async function loadDashboardData() {
  showLoading(true);

  try {
    // Ambil upload aktif
    const { data: uploads, error: uploadErr } = await supabaseClient
      .from('upload_history')
      .select('*')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (uploadErr || !uploads || uploads.length === 0) {
      showLoading(false);
      showNoData(true);
      return;
    }

    const activeUpload = uploads[0];

    // Ambil data sales untuk upload aktif
    const { data: salesData, error: salesErr } = await supabaseClient
      .from('sales_summary')
      .select('*')
      .eq('upload_id', activeUpload.id)
      .order('row_type')
      .order('lob_name')
      .order('tsh_name');

    if (salesErr || !salesData || salesData.length === 0) {
      showLoading(false);
      showNoData(true);
      return;
    }

    allRecords = salesData;

    // Update header periode
    document.getElementById('header-period').textContent = activeUpload.period_label || 'Region 5';
    document.getElementById('period-label').textContent = activeUpload.period_label;
    document.getElementById('last-updated').textContent =
      'Update: ' + new Date(activeUpload.uploaded_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

    const visibleRecords = filterByRole(allRecords);

    showLoading(false);
    showNoData(false);
    document.getElementById('dashboard-content').classList.remove('hidden');

    buildLobTabs(visibleRecords);
    renderDashboard(visibleRecords, 'SEMUA');

  } catch (err) {
    showLoading(false);
    showNoData(true);
    console.error('Error loading dashboard:', err);
  }
}

// ─── ROLE-BASED FILTER ───────────────────────────────────────
function filterByRole(records) {
  // Semua data tampil tanpa filter — akses publik
  return records;
}

// ─── BUILD LOB TABS ──────────────────────────────────────────
function buildLobTabs(records) {
  const tabBar = document.getElementById('lob-tabs');
  const lobs = [...new Set(records.filter(r => r.row_type === 'LOB').map(r => r.lob_name))];

  // Hapus tab selain "Semua"
  while (tabBar.children.length > 1) tabBar.removeChild(tabBar.lastChild);

  lobs.forEach(lob => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.lob = lob;
    btn.textContent = lob.split(' ')[0]; // Nama pendek: MARDIANSAH → MARDIANSAH
    tabBar.appendChild(btn);
  });

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeLob = btn.dataset.lob;

    const filtered = filterByRole(allRecords);
    renderDashboard(filtered, activeLob);
  });
}

// ─── RENDER DASHBOARD ────────────────────────────────────────
function renderDashboard(records, selectedLob) {
  let viewRecords;

  if (selectedLob === 'SEMUA') {
    viewRecords = records;
  } else {
    viewRecords = records.filter(r => r.lob_name === selectedLob);
  }

  renderKPIs(viewRecords, selectedLob);
  renderRanking(viewRecords, selectedLob);
  renderDetailTable(viewRecords, selectedLob);

  // Update chart labels
  document.getElementById('chart-lob-label').textContent =
    selectedLob === 'SEMUA' ? 'Semua LOB' : selectedLob;
  document.getElementById('ranking-lob-label').textContent =
    selectedLob === 'SEMUA' ? 'Semua LOB' : selectedLob;

  renderDailyChart(viewRecords, selectedLob);

  // Channel / Brand / VAS selalu tampil data region (tidak difilter LOB)
  renderSectionList('CHANNEL', 'channel-list');
  renderSectionList('BRAND',   'brand-list');
  renderSectionList('VAS',     'vas-list');

  initTableToggle();
}

// ─── KPI CARDS ───────────────────────────────────────────────
function renderKPIs(records, selectedLob) {
  let lobRows;
  if (selectedLob === 'SEMUA') {
    lobRows = records.filter(r => r.row_type === 'LOB');
  } else {
    lobRows = records.filter(r => r.row_type === 'LOB' && r.lob_name === selectedLob);
  }

  const totalMtd    = sum(lobRows, 'mtd');
  const totalTarget = sum(lobRows, 'target_april');
  const totalEst    = sum(lobRows, 'estimate');
  const pctAch      = totalTarget > 0 ? (totalMtd / totalTarget * 100) : null;
  const pctAchEst   = avg(lobRows, 'pct_ach_est'); // Langsung dari kolom AO Excel
  const avgYoy      = avg(lobRows, 'yoy_growth');
  const avgMom      = avg(lobRows, 'mom_growth');
  const avgYtd      = avg(lobRows, 'ytd_growth');

  // MTD
  setKPI('kpi-mtd', formatRupiah(totalMtd), '', null);

  // Target
  setKPI('kpi-target', formatRupiah(totalTarget), '', null);

  // % Ach vs ROFO
  const achClass = pctAch != null
    ? (pctAch >= 100 ? 'positive' : pctAch >= 80 ? 'warning' : 'negative') : '';
  setKPI('kpi-ach', pctAch != null ? pctAch.toFixed(1) + '%' : '—', 'vs ROFO', achClass);

  // YoY
  const yoyClass = avgYoy != null ? (avgYoy >= 0 ? 'positive' : 'negative') : '';
  setKPI('kpi-yoy',
    avgYoy != null ? (avgYoy >= 0 ? '+' : '') + avgYoy.toFixed(1) + '%' : '—',
    'vs April 2025', yoyClass);

  // Estimasi
  setKPI('kpi-est', formatRupiah(totalEst), 'akhir bulan', null);

  // % Ach vs Est
  const achEstClass = pctAchEst != null
    ? (pctAchEst >= 100 ? 'positive' : pctAchEst >= 80 ? 'warning' : 'negative') : '';
  setKPI('kpi-ach-est',
    pctAchEst != null ? pctAchEst.toFixed(1) + '%' : '—',
    'vs Est Rofo', achEstClass);

  // MoM
  const momClass = avgMom != null ? (avgMom >= 0 ? 'positive' : 'negative') : '';
  setKPI('kpi-mom',
    avgMom != null ? (avgMom >= 0 ? '+' : '') + avgMom.toFixed(1) + '%' : '—',
    'vs Maret 2026', momClass);

  // YTD
  const ytdClass = avgYtd != null ? (avgYtd >= 0 ? 'positive' : 'negative') : '';
  setKPI('kpi-ytd',
    avgYtd != null ? (avgYtd >= 0 ? '+' : '') + avgYtd.toFixed(1) + '%' : '—',
    'Jan–Apr 2026', ytdClass);
}

function setKPI(id, value, sub, colorClass) {
  const valEl = document.getElementById(id);
  const subEl = document.getElementById(id + '-sub');
  if (valEl) {
    valEl.textContent = value;
    valEl.className = 'kpi-value' + (colorClass ? ' ' + colorClass : '');
  }
  if (subEl && sub !== null) subEl.textContent = sub;
}

// ─── RANKING LIST ────────────────────────────────────────────
function renderRanking(records, selectedLob) {
  const container = document.getElementById('ranking-list');
  container.innerHTML = '';
  activeTshDrilldown = null; // reset drilldown state on re-render

  let rows;
  if (selectedLob === 'SEMUA') {
    // Tampilkan semua LOB diurutkan by % ach
    rows = records.filter(r => r.row_type === 'LOB');
  } else {
    // Tampilkan LOB header + semua TSH
    rows = records.filter(r => r.lob_name === selectedLob);
  }

  // Urutkan TSH by % ach est desc, LOB tetap di atas
  const lobRows = rows.filter(r => r.row_type === 'LOB');
  const tshRows = rows.filter(r => r.row_type === 'TSH')
    .sort((a, b) => (b.pct_ach_est || 0) - (a.pct_ach_est || 0));

  const ordered = selectedLob === 'SEMUA'
    ? lobRows.sort((a, b) => (b.pct_ach_est || 0) - (a.pct_ach_est || 0))
    : [...lobRows, ...tshRows];

  if (ordered.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  const maxEst = Math.max(...ordered.map(r => r.estimate || 0), 1);

  ordered.forEach((r, idx) => {
    const name     = r.tsh_name || r.lob_name || '—';
    const pct      = r.pct_ach_est;
    const est      = r.estimate;
    const isLob    = r.row_type === 'LOB';
    const rankNum  = isLob ? '' : (tshRows.indexOf(r) + 1);
    const rankClass = rankNum === 1 ? 'top-1' : rankNum === 2 ? 'top-2' : rankNum === 3 ? 'top-3' : '';

    // Bar fill color
    let barColor = '#CBD5E0';
    if (pct != null) {
      barColor = pct >= 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
    }
    const barWidth = est != null ? Math.min((est / maxEst) * 100, 100).toFixed(1) : 0;

    const hasDrilldown = !isLob && TSH_STORE_DATA.hasOwnProperty(name);

    const div = document.createElement('div');
    div.className = 'ranking-item' + (isLob ? ' is-lob' : '') + (hasDrilldown ? ' has-drilldown' : '');
    if (hasDrilldown) div.dataset.tsh = name;
    div.innerHTML = `
      <div class="ranking-rank ${rankClass}">${isLob ? '▸' : rankNum}</div>
      <div class="ranking-info">
        <div class="ranking-name">
          ${hasDrilldown ? '<span class="tsh-chevron">▶</span>' : ''}${name}
        </div>
        <div class="ranking-bar-wrap">
          <div class="ranking-bar-bg">
            <div class="ranking-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <span class="ranking-pct ${achColor(pct)}">
            ${pct != null ? pct.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>
      <div class="ranking-mtd">${formatRupiah(est)}</div>
    `;

    if (hasDrilldown) {
      // Drilldown panel element (inserted after the row)
      const panel = document.createElement('div');
      panel.className = 'tsh-drilldown-panel';
      panel.dataset.tsh = name;

      const stores = TSH_STORE_DATA[name];
      const rows = stores.map((s, i) => {
        const achPct = s.ach;
        const achStr = achPct > 0
          ? `<span class="store-ach-pos">${achPct.toFixed ? achPct.toFixed(0) : achPct}%</span>`
          : `<span class="store-ach-zero">0%</span>`;
        return `
          <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td class="store-col-no">${i + 1}</td>
            <td class="store-col-code">${s.code}</td>
            <td class="store-col-name">${s.name}</td>
            <td class="store-col-ach">${achStr}</td>
          </tr>`;
      }).join('');

      panel.innerHTML = `
        <div class="tsh-drilldown-header">
          <span>Toko - ${name} <span class="store-count">(${stores.length} toko)</span></span>
          <button class="tsh-drilldown-close" data-tsh="${name}" aria-label="Tutup">×</button>
        </div>
        <div class="tsh-drilldown-body">
          <table class="store-table">
            <thead>
              <tr>
                <th class="store-col-no">No</th>
                <th class="store-col-code">Code</th>
                <th class="store-col-name">Store Name</th>
                <th class="store-col-ach">Ach %</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      div.addEventListener('click', (e) => {
        if (e.target.closest('.tsh-drilldown-close')) return;
        const tshKey = div.dataset.tsh;
        if (activeTshDrilldown === tshKey) {
          // close
          closeTshDrilldown(container);
        } else {
          closeTshDrilldown(container);
          activeTshDrilldown = tshKey;
          div.classList.add('drilldown-open');
          div.querySelector('.tsh-chevron').textContent = '▼';
          panel.classList.add('open');
        }
      });

      panel.querySelector('.tsh-drilldown-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTshDrilldown(container);
      });

      container.appendChild(div);
      container.appendChild(panel);
    } else {
      container.appendChild(div);
    }
  });
}

function closeTshDrilldown(container) {
  if (!activeTshDrilldown) return;
  const openItem = container.querySelector(`.ranking-item[data-tsh="${CSS.escape(activeTshDrilldown)}"]`);
  const openPanel = container.querySelector(`.tsh-drilldown-panel[data-tsh="${CSS.escape(activeTshDrilldown)}"]`);
  if (openItem) {
    openItem.classList.remove('drilldown-open');
    const chevron = openItem.querySelector('.tsh-chevron');
    if (chevron) chevron.textContent = '▶';
  }
  if (openPanel) openPanel.classList.remove('open');
  activeTshDrilldown = null;
}

// ─── DETAIL TABLE ────────────────────────────────────────────
function renderDetailTable(records, selectedLob) {
  const tbody = document.getElementById('detail-tbody');
  tbody.innerHTML = '';

  let rows;
  if (selectedLob === 'SEMUA') {
    rows = records;
  } else {
    rows = records.filter(r => r.lob_name === selectedLob);
  }

  // Group: LOB dulu lalu TSH-nya
  const grouped = [];
  const lobs = [...new Set(rows.filter(r => r.row_type === 'LOB').map(r => r.lob_name))];
  lobs.forEach(lob => {
    const lobRow = rows.find(r => r.row_type === 'LOB' && r.lob_name === lob);
    if (lobRow) grouped.push(lobRow);
    rows.filter(r => r.row_type === 'TSH' && r.lob_name === lob).forEach(t => grouped.push(t));
  });

  grouped.forEach(r => {
    const isLob  = r.row_type === 'LOB';
    const name   = r.tsh_name || r.lob_name || '—';
    const pctAch = r.pct_ach_mtd;
    const pctEst = r.pct_ach_est;
    const mom    = r.mom_growth;
    const yoy    = r.yoy_growth;

    const tr = document.createElement('tr');
    tr.className = isLob ? 'row-lob' : 'row-tsh';
    tr.innerHTML = `
      <td class="col-name">
        ${!isLob ? '<span style="margin-right:0.5rem;opacity:.3;font-size:.75rem;">└</span>' : ''}
        ${name}
      </td>
      <td class="col-num">${formatRupiah(r.target_april)}</td>
      <td class="col-num">${formatRupiah(r.mtd)}</td>
      <td class="col-pct ${achColor(pctAch)}">${pctAch != null ? pctAch.toFixed(1) + '%' : '—'}</td>
      <td class="col-num">${formatRupiah(r.estimate)}</td>
      <td class="col-pct ${achColor(pctEst)}">${pctEst != null ? pctEst.toFixed(1) + '%' : '—'}</td>
      <td class="col-pct ${trendColor(mom)}">${mom != null ? (mom >= 0 ? '+' : '') + mom.toFixed(1) + '%' : '—'}</td>
      <td class="col-pct ${trendColor(yoy)}">${yoy != null ? (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '%' : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── CHANNEL / BRAND / VAS LIST ──────────────────────────
function renderSectionList(rowType, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = allRecords
    .filter(r => r.row_type === rowType)
    .sort((a, b) => (b.pct_ach_est || 0) - (a.pct_ach_est || 0));

  if (rows.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  container.innerHTML = '';
  const maxEst = Math.max(...rows.map(r => r.estimate || 0), 1);

  rows.forEach((r, idx) => {
    const name     = r.tsh_name || '—';
    const pct      = r.pct_ach_est;
    const est      = r.estimate;
    const rankNum  = idx + 1;
    const rankClass = rankNum === 1 ? 'top-1' : rankNum === 2 ? 'top-2' : rankNum === 3 ? 'top-3' : '';

    let barColor = '#CBD5E0';
    if (pct != null) {
      barColor = pct >= 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
    }
    const barWidth = est != null ? Math.min((est / maxEst) * 100, 100).toFixed(1) : 0;

    const div = document.createElement('div');
    div.className = 'ranking-item';
    div.innerHTML = `
      <div class="ranking-rank ${rankClass}">${rankNum}</div>
      <div class="ranking-info">
        <div class="ranking-name">${name}</div>
        <div class="ranking-bar-wrap">
          <div class="ranking-bar-bg">
            <div class="ranking-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <span class="ranking-pct ${achColor(pct)}">
            ${pct != null ? pct.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>
      <div class="ranking-mtd">${formatRupiah(est)}</div>
    `;
    container.appendChild(div);
  });
}

// ─── PROFILE MODAL ───────────────────────────────────────────
function renderUserHeader() {
  if (!userProfile?.profile) return;
  const p = userProfile.profile;
  const initials = getInitials(p.full_name);

  document.getElementById('user-avatar').textContent       = initials;
  document.getElementById('user-name-display').textContent = p.full_name.split(' ')[0];
  document.getElementById('modal-avatar').textContent      = initials;
  document.getElementById('modal-name').textContent        = p.full_name;
  document.getElementById('modal-role').textContent        = p.role.toUpperCase();
  document.getElementById('modal-lob').textContent         =
    p.lob_name ? 'LOB: ' + p.lob_name : '';
}

function initProfileModal() {
  const modal    = document.getElementById('profile-modal');
  const userInfo = document.getElementById('header-user-info');
  const navProf  = document.getElementById('nav-profile');
  const closeBtn = document.getElementById('modal-close-btn');

  const open  = () => modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');

  if (userInfo) userInfo.addEventListener('click', open);
  if (navProf)  navProf.addEventListener('click', (e) => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ─── DESKTOP NAV ─────────────────────────────────────────────
function initDesktopNav() {
  const setActive = (id) => {
    document.querySelectorAll('.desktop-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  };

  document.getElementById('dnav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActive('dnav-dashboard');
  });

  document.getElementById('dnav-chart')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('chart-daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive('dnav-chart');
  });

  document.getElementById('dnav-team')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('ranking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive('dnav-team');
  });

  document.getElementById('dnav-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('profile-modal')?.classList.remove('hidden');
    setActive('dnav-profile');
  });
}

// ─── BOTTOM NAV ──────────────────────────────────────────────
function initBottomNav() {
  const navChart = document.getElementById('nav-chart');
  const navTeam  = document.getElementById('nav-team');
  const navProf  = document.getElementById('nav-profile');

  if (navChart) {
    navChart.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('chart-daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      navChart.classList.add('active');
    });
  }

  if (navTeam) {
    navTeam.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('ranking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      navTeam.classList.add('active');
    });
  }

  if (navProf) {
    navProf.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('profile-modal')?.classList.remove('hidden');
    });
  }
}

// ─── TABLE TOGGLE ────────────────────────────────────────────
function initTableToggle() {
  const btn     = document.getElementById('toggle-table-btn');
  const wrapper = document.getElementById('detail-table-wrapper');
  if (!btn || !wrapper) return;

  btn.addEventListener('click', () => {
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? '' : 'none';
    btn.style.transform = isHidden ? '' : 'rotate(-90deg)';
  });
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────
function sum(arr, key) {
  return arr.reduce((acc, r) => acc + (r[key] || 0), 0);
}

function avg(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v != null && !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.toggle('hidden', !show);
}

function showNoData(show) {
  const el = document.getElementById('no-data-state');
  if (el) el.classList.toggle('hidden', !show);
}
