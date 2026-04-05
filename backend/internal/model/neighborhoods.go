package model

// Neighborhood represents a curated neighborhood within a city.
type Neighborhood struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

// Neighborhoods maps city slugs to their curated neighborhood lists.
var Neighborhoods = map[string][]Neighborhood{
	"paris": {
		{ID: "1er", Name: "1er — Louvre", Lat: 48.8606, Lng: 2.3477},
		{ID: "2e", Name: "2e — Bourse", Lat: 48.8667, Lng: 2.3469},
		{ID: "3e", Name: "3e — Temple", Lat: 48.8638, Lng: 2.3595},
		{ID: "4e", Name: "4e — Hôtel-de-Ville", Lat: 48.8534, Lng: 2.3535},
		{ID: "5e", Name: "5e — Panthéon", Lat: 48.8462, Lng: 2.3508},
		{ID: "6e", Name: "6e — Luxembourg", Lat: 48.8490, Lng: 2.3340},
		{ID: "7e", Name: "7e — Palais-Bourbon", Lat: 48.8566, Lng: 2.3186},
		{ID: "8e", Name: "8e — Élysée", Lat: 48.8748, Lng: 2.3090},
		{ID: "9e", Name: "9e — Opéra", Lat: 48.8764, Lng: 2.3386},
		{ID: "10e", Name: "10e — Entrepôt", Lat: 48.8760, Lng: 2.3618},
		{ID: "11e", Name: "11e — Popincourt", Lat: 48.8594, Lng: 2.3790},
		{ID: "12e", Name: "12e — Reuilly", Lat: 48.8402, Lng: 2.3918},
		{ID: "13e", Name: "13e — Gobelins", Lat: 48.8312, Lng: 2.3561},
		{ID: "14e", Name: "14e — Observatoire", Lat: 48.8330, Lng: 2.3267},
		{ID: "15e", Name: "15e — Vaugirard", Lat: 48.8422, Lng: 2.2966},
		{ID: "16e", Name: "16e — Passy", Lat: 48.8638, Lng: 2.2769},
		{ID: "17e", Name: "17e — Batignolles", Lat: 48.8882, Lng: 2.3118},
		{ID: "18e", Name: "18e — Butte-Montmartre", Lat: 48.8921, Lng: 2.3444},
		{ID: "19e", Name: "19e — Buttes-Chaumont", Lat: 48.8797, Lng: 2.3823},
		{ID: "20e", Name: "20e — Ménilmontant", Lat: 48.8631, Lng: 2.3972},
	},
	"tokyo": {
		{ID: "shinjuku", Name: "Shinjuku", Lat: 35.6938, Lng: 139.7036},
		{ID: "shibuya", Name: "Shibuya", Lat: 35.6590, Lng: 139.7006},
		{ID: "harajuku", Name: "Harajuku", Lat: 35.6702, Lng: 139.7027},
		{ID: "asakusa", Name: "Asakusa", Lat: 35.7148, Lng: 139.7967},
		{ID: "ginza", Name: "Ginza", Lat: 35.6717, Lng: 139.7650},
		{ID: "akihabara", Name: "Akihabara", Lat: 35.7022, Lng: 139.7741},
		{ID: "roppongi", Name: "Roppongi", Lat: 35.6628, Lng: 139.7314},
		{ID: "shimokitazawa", Name: "Shimokitazawa", Lat: 35.6613, Lng: 139.6681},
		{ID: "yanaka", Name: "Yanaka", Lat: 35.7266, Lng: 139.7664},
		{ID: "nakameguro", Name: "Nakameguro", Lat: 35.6440, Lng: 139.6990},
	},
	"london": {
		{ID: "soho", Name: "Soho", Lat: 51.5137, Lng: -0.1337},
		{ID: "shoreditch", Name: "Shoreditch", Lat: 51.5247, Lng: -0.0793},
		{ID: "notting-hill", Name: "Notting Hill", Lat: 51.5078, Lng: -0.2010},
		{ID: "camden", Name: "Camden", Lat: 51.5390, Lng: -0.1426},
		{ID: "south-bank", Name: "South Bank", Lat: 51.5055, Lng: -0.1132},
		{ID: "mayfair", Name: "Mayfair", Lat: 51.5100, Lng: -0.1494},
		{ID: "covent-garden", Name: "Covent Garden", Lat: 51.5117, Lng: -0.1234},
		{ID: "greenwich", Name: "Greenwich", Lat: 51.4826, Lng: -0.0077},
		{ID: "brixton", Name: "Brixton", Lat: 51.4613, Lng: -0.1156},
		{ID: "islington", Name: "Islington", Lat: 51.5362, Lng: -0.1033},
	},
	"barcelona": {
		{ID: "gothic-quarter", Name: "Gothic Quarter", Lat: 41.3833, Lng: 2.1777},
		{ID: "eixample", Name: "Eixample", Lat: 41.3924, Lng: 2.1607},
		{ID: "gracia", Name: "Gràcia", Lat: 41.4034, Lng: 2.1574},
		{ID: "el-born", Name: "El Born", Lat: 41.3851, Lng: 2.1834},
		{ID: "el-raval", Name: "El Raval", Lat: 41.3796, Lng: 2.1686},
		{ID: "barceloneta", Name: "Barceloneta", Lat: 41.3807, Lng: 2.1896},
		{ID: "poblenou", Name: "Poblenou", Lat: 41.4008, Lng: 2.2013},
		{ID: "montjuic", Name: "Montjuïc", Lat: 41.3641, Lng: 2.1576},
		{ID: "gracia-alta", Name: "Sant Gervasi", Lat: 41.4080, Lng: 2.1394},
		{ID: "poble-sec", Name: "Poble Sec", Lat: 41.3731, Lng: 2.1601},
	},
	"nyc": {
		{ID: "soho", Name: "SoHo", Lat: 40.7233, Lng: -73.9985},
		{ID: "greenwich-village", Name: "Greenwich Village", Lat: 40.7336, Lng: -74.0027},
		{ID: "east-village", Name: "East Village", Lat: 40.7265, Lng: -73.9815},
		{ID: "les", Name: "Lower East Side", Lat: 40.7153, Lng: -73.9847},
		{ID: "chelsea", Name: "Chelsea", Lat: 40.7465, Lng: -74.0014},
		{ID: "williamsburg", Name: "Williamsburg", Lat: 40.7081, Lng: -73.9571},
		{ID: "upper-west-side", Name: "Upper West Side", Lat: 40.7870, Lng: -73.9754},
		{ID: "harlem", Name: "Harlem", Lat: 40.8116, Lng: -73.9465},
		{ID: "dumbo", Name: "DUMBO", Lat: 40.7033, Lng: -73.9903},
		{ID: "midtown", Name: "Midtown", Lat: 40.7549, Lng: -73.9840},
		{ID: "chinatown", Name: "Chinatown", Lat: 40.7158, Lng: -73.9970},
		{ID: "tribeca", Name: "Tribeca", Lat: 40.7163, Lng: -74.0086},
		{ID: "bushwick", Name: "Bushwick", Lat: 40.6944, Lng: -73.9213},
		{ID: "west-village", Name: "West Village", Lat: 40.7358, Lng: -74.0036},
	},
}
