enum Region {
    KingsCage = "KingsCage",
    Westgate = "Westgate",
    FarranacCoast = "FarranacCoast",
    EndlessShore = "EndlessShore",
    StlicanShelf = "StlicanShelf",
    Oarbreaker = "Oarbreaker",
    FishermansRow = "FishermansRow",
    StemaLanding = "StemaLanding",
    Godcrofts = "Godcrofts",
    Sableport = "Sableport",
    TempestIsland = "TempestIsland",
    ReaversPass = "ReaversPass",
    TheFingers = "TheFingers",
    Clahstra = "Clahstra",
    DeadLands = "DeadLands",
    CallahansPassage = "CallahansPassage",
    MarbanHollow = "MarbanHollow",
    UmbralWildwood = "UmbralWildwood",
    MooringCounty = "MooringCounty",
    Heartlands = "Heartlands",
    LochMor = "LochMor",
    LinnMercy = "LinnMercy",
    ReachingTrail = "ReachingTrail",
    Stonecradle = "Stonecradle",
    GreatMarch = "GreatMarch",
    AllodsBight = "AllodsBight",
    WeatheredExpanse = "WeatheredExpanse",
    DrownedVale = "DrownedVale",
    ShackledChasm = "ShackledChasm",
    ViperPit = "ViperPit",
    NevishLine = "NevishLine",
    Acrithia = "Acrithia",
    RedRiver = "RedRiver",
    CallumsCape = "CallumsCape",
    SpeakingWoods = "SpeakingWoods",
    BasinSionnach = "BasinSionnach",
    HowlCounty = "HowlCounty",
    ClansheadValley = "ClansheadValley",
    MorgensCrossing = "MorgensCrossing",
    Terminus = "Terminus",
    Kalokai = "Kalokai",
    AshFields = "AshFields",
    Origin = "Origin",
    KuuraStrand = "KuuraStrand",            // Update 63
    Gutter = "Gutter",                      // Update 63
    Wresta = "Wresta",                      // Update 63
    TyrantFoothills = "TyrantFoothills",    // Update 63
    PipersEnclave = "PipersEnclave",        // Update 63
    LykosIsle = "LykosIsle",                // Update 63
    PariPeak = "PariPeak",                  // Update 63
    OlavisWake = "OlavisWake",              // Update 63
    PalantineBerm = "PalantineBerm",        // Update 63
    Onyx = "Onyx",                          // Update 63
    Empty = "Empty",
}


export interface RegionStruct {
    row: number;
    col: number;
    id: number;
    name: Region;
    apiName: string;
    displayName: string;
    imageName: string;
}

export const regions: Array<RegionStruct> = [
    { row: 1, col: 0, id: 0, name: Region.BasinSionnach, apiName: "BasinSionnachHex", displayName: "Basin Sionnach", imageName: "BasinSionnachHex" },
    
    { row: 2, col: 0, id: 0, name: Region.SpeakingWoods, apiName: "SpeakingWoodsHex", displayName: "Speaking Woods", imageName: "SpeakingWoodsHex" },
    { row: 2, col: 1, id: 0, name: Region.HowlCounty, apiName: "HowlCountyHex", displayName: "Howl County", imageName: "HowlCountyHex" },
    
    { row: 3, col: 0, id: 52, name: Region.KuuraStrand, apiName: "KuuraStrandHex", displayName: "Kuura Strand", imageName: "KuuraStrandHex" },                  // Update 63
    { row: 3, col: 1, id: 0, name: Region.CallumsCape, apiName: "CallumsCapeHex", displayName: "Callum's Cape", imageName: "CallumsCapeHex" },
    { row: 3, col: 2, id: 0, name: Region.ReachingTrail, apiName: "ReachingTrailHex", displayName: "Reaching Trail", imageName: "ReachingTrailHex" },
    { row: 3, col: 3, id: 0, name: Region.ClansheadValley, apiName: "ClansheadValleyHex", displayName: "Clanshead Valley", imageName: "ClansheadValleyHex" },
    
    { row: 4, col: 0, id: 50, name: Region.PariPeak, apiName: "PariPeakHex", displayName: "Pari Peak", imageName: "PariPeakHex" },                              // Update 63
    { row: 4, col: 1, id: 0, name: Region.NevishLine, apiName: "NevishLineHex", displayName: "Nevish Line", imageName: "NevishLineHex" },
    { row: 4, col: 2, id: 0, name: Region.MooringCounty, apiName: "MooringCountyHex", displayName: "The Moors", imageName: "MooringCountyHex" },
    { row: 4, col: 3, id: 0, name: Region.ViperPit, apiName: "ViperPitHex", displayName: "Viper Pit", imageName: "ViperPitHex" },
    { row: 4, col: 4, id: 0, name: Region.MorgensCrossing, apiName: "MorgensCrossingHex", displayName: "Morgen's Crossing", imageName: "MorgensCrossingHex" },
    
    { row: 5, col: 0, id: 49, name: Region.OlavisWake, apiName: "OlavisWakeHex", displayName: "Olavis Wake", imageName: "OlavisWakeHex" },                      // Update 63
    { row: 5, col: 1, id: 0, name: Region.Gutter, apiName: "GutterHex", displayName: "Gutter", imageName: "GutterHex" },                                       // Update 63
    { row: 5, col: 2, id: 0, name: Region.Stonecradle, apiName: "StonecradleHex", displayName: "Stonecradle", imageName: "StonecradleHex" },
    { row: 5, col: 3, id: 0, name: Region.CallahansPassage, apiName: "CallahansPassageHex", displayName: "Callahan's Passage", imageName: "CallahansPassageHex" },
    { row: 5, col: 4, id: 0, name: Region.WeatheredExpanse, apiName: "WeatheredExpanseHex", displayName: "Weathered Expanse", imageName: "WeatheredExpanseHex" },
    { row: 5, col: 5, id: 0, name: Region.Godcrofts, apiName: "GodcroftsHex", displayName: "Godcrofts", imageName: "GodcroftsHex" },
    
    { row: 6, col: 0, id: 51, name: Region.PalantineBerm, apiName: "PalantineBermHex", displayName: "Palantine Berm", imageName: "PalantineBermHex" },          // Update 63
    { row: 6, col: 1, id: 0, name: Region.FarranacCoast, apiName: "FarranacCoastHex", displayName: "Farranac Coast", imageName: "FarranacCoastHex" },
    { row: 6, col: 2, id: 0, name: Region.LinnMercy, apiName: "LinnMercyHex", displayName: "Linn of Mercy", imageName: "LinnMercyHex" },
    { row: 6, col: 3, id: 0, name: Region.MarbanHollow, apiName: "MarbanHollow", displayName: "Marban Hollow", imageName: "MarbanHollow" },
    { row: 6, col: 4, id: 0, name: Region.StlicanShelf, apiName: "StlicanShelfHex", displayName: "Stlican Shelf", imageName: "StlicanShelfHex" },
    { row: 6, col: 5, id: 56, name: Region.LykosIsle, apiName: "LykosIsleHex", displayName: "Lykos Isle", imageName: "LykosIsleHex" },                          // Update 63
    
    { row: 7, col: 0, id: 0, name: Region.FishermansRow, apiName: "FishermansRowHex", displayName: "Fisherman's Row", imageName: "FishermansRowHex" },
    { row: 7, col: 1, id: 0, name: Region.KingsCage, apiName: "KingsCageHex", displayName: "King's Cage", imageName: "KingsCageHex" },
    { row: 7, col: 2, id: 0, name: Region.DeadLands, apiName: "DeadLandsHex", displayName: "Deadlands", imageName: "DeadLandsHex" },
    { row: 7, col: 3, id: 0, name: Region.Clahstra, apiName: "ClahstraHex", displayName: "The Clahstra", imageName: "ClahstraHex" },
    { row: 7, col: 4, id: 0, name: Region.TempestIsland, apiName: "TempestIslandHex", displayName: "Tempest Island", imageName: "TempestIslandHex" },
    
    { row: 8, col: 0, id: 0, name: Region.Oarbreaker, apiName: "OarbreakerHex", displayName: "Oarbreaker Isles", imageName: "OarbreakerHex" },
    { row: 8, col: 1, id: 0, name: Region.Westgate, apiName: "WestgateHex", displayName: "Westgate", imageName: "WestgateHex" },
    { row: 8, col: 2, id: 0, name: Region.LochMor, apiName: "LochMorHex", displayName: "Loch Mór", imageName: "LochMorHex" },
    { row: 8, col: 3, id: 0, name: Region.DrownedVale, apiName: "DrownedValeHex", displayName: "Drowned Vale", imageName: "DrownedValeHex" },
    { row: 8, col: 4, id: 0, name: Region.EndlessShore, apiName: "EndlessShoreHex", displayName: "Endless Shore", imageName: "EndlessShoreHex" },
    { row: 8, col: 5, id: 0, name: Region.TheFingers, apiName: "TheFingersHex", displayName: "The Fingers", imageName: "TheFingersHex" },
    
    { row: 9, col: 1, id: 0, name: Region.StemaLanding, apiName: "StemaLandingHex", displayName: "Stema Landing", imageName: "StemaLandingHex" },
    { row: 9, col: 2, id: 0, name: Region.Sableport, apiName: "SableportHex", displayName: "Sableport", imageName: "SableportHex" },
    { row: 9, col: 3, id: 0, name: Region.UmbralWildwood, apiName: "UmbralWildwoodHex", displayName: "Umbral Wildwood", imageName: "UmbralWildwoodHex" },
    { row: 9, col: 4, id: 0, name: Region.AllodsBight, apiName: "AllodsBightHex", displayName: "Allod's Bight", imageName: "AllodsBightHex" },
    { row: 9, col: 5, id: 54, name: Region.Wresta, apiName: "WrestaHex", displayName: "Wresta", imageName: "WrestaHex" },                                       // Update 63
    { row: 9, col: 6, id: 58, name: Region.PipersEnclave, apiName: "PipersEnclaveHex", displayName: "Pipers Enclave", imageName: "PipersEnclaveHex" },          // Update 63
    
    { row: 10, col: 1, id: 0, name: Region.Origin, apiName: "OriginHex", displayName: "Origin", imageName: "OriginHex" },
    { row: 10, col: 2, id: 0, name: Region.Heartlands, apiName: "HeartlandsHex", displayName: "Heartlands", imageName: "HeartlandsHex" },
    { row: 10, col: 3, id: 0, name: Region.ShackledChasm, apiName: "ShackledChasmHex", displayName: "Shackled Chasm", imageName: "ShackledChasmHex" },
    { row: 10, col: 4, id: 0, name: Region.ReaversPass, apiName: "ReaversPassHex", displayName: "Reaver's Pass", imageName: "ReaversPassHex" },
    { row: 10, col: 5, id: 0, name: Region.TyrantFoothills, apiName: "TyrantFoothillsHex", displayName: "Tyrant Foothills", imageName: "TyrantFoothillsHex" },  // Update 63
    
    { row: 11, col: 1, id: 0, name: Region.AshFields, apiName: "AshFieldsHex", displayName: "Ash Fields", imageName: "AshFieldsHex" },
    { row: 11, col: 2, id: 0, name: Region.GreatMarch, apiName: "GreatMarchHex", displayName: "Great March", imageName: "GreatMarchHex" },
    { row: 11, col: 3, id: 0, name: Region.Terminus, apiName: "TerminusHex", displayName: "Terminus", imageName: "TerminusHex" },
    { row: 11, col: 4, id: 55, name: Region.Onyx, apiName: "OnyxHex", displayName: "Onyx", imageName: "OnyxHex" },                                               // Update 63
    
    { row: 12, col: 0, id: 0, name: Region.RedRiver, apiName: "RedRiverHex", displayName: "Red River", imageName: "RedRiverHex" },
    { row: 12, col: 1, id: 0, name: Region.Acrithia, apiName: "AcrithiaHex", displayName: "Acrithia", imageName: "AcrithiaHex" },
    
    { row: 13, col: 0, id: 0, name: Region.Kalokai, apiName: "KalokaiHex", displayName: "Kalokai", imageName: "KalokaiHex" },  
];



export function getRegionByApiName(name: string): RegionStruct | undefined {
  return regions.find((region) => region.apiName === name);
}

export function getRegion(name: Region): RegionStruct | undefined {
  return regions.find((region) => region.name === name);
}

export { Region };
export default regions;