enum MapIcon {
    Town_Base_1 = 56,
    Town_Base_2 = 57,
    Town_Base_3 = 58,
    Relic_Base_1 = 45,
    Keep = 27,
    Fort = 29,
    Forward_Base_1 = 8,
    Garrison_Station = 35,
    Hospital = 11,
    Troop_Ship = 30,
    Vehicle_Factory = 12,
    Shipyard = 18,
    Construction_Yard = 39,
    Refinery = 17,
    Factory = 34,
    Mass_Production_Factory = 51,
    Seaport = 52,
    Storage_Facility = 33,
    Salvage_Field = 20,
    Component_Field = 21,
    Fuel_Field = 22,
    Sulfur_Field = 23,
    Coal_Field = 61,
    Oil_Field = 62,
    Salvage_Mine = 38,
    Component_Mine = 40,
    Sulfur_Mine = 32,
    Oil_Rig = 75,
    Storm_Cannon = 59,
    Coastal_Gun = 53,
    Mortar_House = 84,
    Soul_Factory = 54,
    Intel_Center = 60,
    Weather_Station = 83,
    Tech_Center = 19,
    Observation_Tower = 28,
    Rocket_Site = 37,
    Rocket_Site_With_Rocket = 72,
    Rocket_Target = 70,
    Rocket_Ground_Zero = 71,
    World_Map_Tent = 24,
    Travel_Tent = 25,
    Training_Area = 26
}

enum MapIconTag {
    // Logistics
    Economy = "Economy",
    Storage = "Storage",
    Factory = "Factory",
    Logistics = "Logistics",
    Production = "Production",
    Construction = "Construction",
    // Resources
    Resource = "Resource",
    Resource_Field = "Resource_Field",
    Resource_Mine = "Resource_Mine",
    Resource_Salvage = "Resource_Salvage",
    Resource_Component = "Resource_Component",
    Resource_Fuel = "Resource_Fuel",
    Resource_Sulfur = "Resource_Sulfur",
    Resource_Coal = "Resource_Coal",
    Resource_Oil = "Resource_Oil",
    // Types
    Base = "Base",
    Spawn = "Spawn",
    Utility = "Utility",
    Static = "Static",
    Defense = "Defense",
    Victory_Point = "Victory_Point",

    // Base types
    Base_Town = "Base_Town",
    Base_Relic = "Base_Relic",
    Base_Keep = "Base_Keep",
    Base_Fort = "Base_Fort",
    Base_Garrison = "Base_Garrison",
    Base_Hospital = "Base_Hospital",
    Base_Forward = "Base_Forward",
    Base_Ship = "Base_Ship",
    // Bases
    Town_Base_1 = "Town_Base_1",
    Town_Base_2 = "Town_Base_2",
    Town_Base_3 = "Town_Base_3",
    Relic_Base_1 = "Relic_Base_1",
    Forward_Base_1 = "Forward_Base_1",
    Garrison_Station = "Garrison_Station",
    Hospital = "Hospital",
    Troop_Ship = "Troop_Ship",
    // Construction
    Vehicle_Factory = "Vehicle_Factory",
    Shipyard = "Shipyard",
    Construction_Yard = "Construction_Yard",
    // Economy
    Refinery = "Refinery",
    Mass_Production_Factory = "Mass_Production_Factory",
    // Storage
    Seaport = "Seaport",
    Storage_Facility = "Storage_Facility",
    // Resource Fields
    Salvage_Field = "Salvage_Field",
    Component_Field = "Component_Field",
    Fuel_Field = "Fuel_Field",
    Sulfur_Field = "Sulfur_Field",
    Coal_Field = "Coal_Field",
    Oil_Field = "Oil_Field",
    // Resource Mines
    Salvage_Mine = "Salvage_Mine",
    Component_Mine = "Component_Mine",
    Sulfur_Mine = "Sulfur_Mine",
    Oil_Rig = "Oil_Rig",
    // Emplacements
    Storm_Cannon = "Storm_Cannon",
    Coastal_Gun = "Coastal_Gun",
    Mortar_House = "Mortar_House",
    // Whatever a Soul Factory is???
    Soul_Factory = "Soul_Factory",
    // Utility
    Intel_Center = "Intel_Center",
    Weather_Station = "Weather_Station",
    Tech_Center = "Tech_Center",
    Observation_Tower = "Observation_Tower",
    // Rockets
    Rocket = "Rocket",
    Rocket_Site = "Rocket_Site",
    Rocket_Site_With_Rocket = "Rocket_Site_With_Rocket",
    Rocket_Target = "Rocket_Target",
    Rocket_Ground_Zero = "Rocket_Ground_Zero",
    // Home Island
    World_Map_Tent = "World_Map_Tent",
    Travel_Tent = "Travel_Tent",
    Training_Area = "Training_Area",
}

interface MapIconStruct {
    id: MapIcon;
    apiName: string;
    iconFileName: string;
    displayName: string;
    tags: Array<MapIconTag>;
}

const mapIcons: Array<MapIconStruct> = [
    {
        "id": MapIcon.Town_Base_1,
        "apiName": "Town Base 1",
        "iconFileName": "TownBaseTier1",
        "displayName": "Town Base",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Town,
            MapIconTag.Town_Base_1
        ]
    },
    {
        "id": MapIcon.Town_Base_2,
        "apiName": "Town Base 2",
        "iconFileName": "TownBaseTier2",
        "displayName": "Town Base T2",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Town,
            MapIconTag.Town_Base_2
        ]
    },
    {
        "id": MapIcon.Town_Base_3,
        "apiName": "Town Base 3",
        "iconFileName": "TownBaseTier3",
        "displayName": "Town Base T3",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Town,
            MapIconTag.Town_Base_3,
            MapIconTag.Victory_Point
        ]
    },

    {
        "id": MapIcon.Relic_Base_1,
        "apiName": "Relic Base 1",
        "iconFileName": "RelicBase",
        "displayName": "Relic Base",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Relic,
            MapIconTag.Relic_Base_1
        ]
    },
    {
        "id": MapIcon.Keep,
        "apiName": "Special Base (Keep)",
        "iconFileName": "Keep",
        "displayName": "Keep",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Keep
        ]
    },
    {
        "id": MapIcon.Fort,
        "apiName": "Fort",
        "iconFileName": "Fort",
        "displayName": "Fort",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Fort
        ]
    },
    {
        "id": MapIcon.Forward_Base_1,
        "apiName": "Forward Base 1",
        "iconFileName": "ForwardBase1",
        "displayName": "Forward Base",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Forward,
            MapIconTag.Forward_Base_1
        ]
    },
    {
        "id": MapIcon.Garrison_Station,
        "apiName": "Garrison Station",
        "iconFileName": "Safehouse",
        "displayName": "Garrison Station",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Garrison_Station
        ]
    },
    {
        "id": MapIcon.Hospital,
        "apiName": "Hospital",
        "iconFileName": "Medical",
        "displayName": "Hospital",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Hospital
        ]
    },
    {
        "id": MapIcon.Troop_Ship,
        "apiName": "Troop Ship",
        "iconFileName": "TroopShip",
        "displayName": "Troop Ship",
        "tags": [
            MapIconTag.Base,
            MapIconTag.Spawn,
            MapIconTag.Storage,
            MapIconTag.Base_Ship,
            MapIconTag.Troop_Ship
        ]
    },

    {
        "id": MapIcon.Vehicle_Factory,
        "apiName": "Vehicle Factory",
        "iconFileName": "Vehicle",
        "displayName": "Vehicle Factory",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Construction,
            MapIconTag.Static,
            MapIconTag.Vehicle_Factory
        ]
    },
    {
        "id": MapIcon.Shipyard,
        "apiName": "Shipyard",
        "iconFileName": "Shipyard",
        "displayName": "Shipyard",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Construction,
            MapIconTag.Static,
            MapIconTag.Shipyard
        ]
    },
    {
        "id": MapIcon.Construction_Yard,
        "apiName": "Construction Yard",
        "iconFileName": "ConstructionYard",
        "displayName": "Construction Yard",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Construction,
            MapIconTag.Static,
            MapIconTag.Construction_Yard
        ]
    },
    {
        "id": MapIcon.Refinery,
        "apiName": "Refinery",
        "iconFileName": "Manufacturing",
        "displayName": "Refinery",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Production,
            MapIconTag.Static,
            MapIconTag.Refinery
        ]
    },
    {
        "id": MapIcon.Factory,
        "apiName": "Factory",
        "iconFileName": "Factory",
        "displayName": "Factory",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Production,
            MapIconTag.Static,
            MapIconTag.Factory
        ]
    },
    {
        "id": MapIcon.Mass_Production_Factory,
        "apiName": "Mass Production Factory",
        "iconFileName": "MassProductionFactory",
        "displayName": "Mass Production Factory",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Production,
            MapIconTag.Static,
            MapIconTag.Factory,
            MapIconTag.Mass_Production_Factory
        ]
    },
    {
        "id": MapIcon.Seaport,
        "apiName": "Seaport",
        "iconFileName": "Seaport",
        "displayName": "Seaport",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Logistics,
            MapIconTag.Storage,
            MapIconTag.Static,
            MapIconTag.Seaport
        ]
    },
    {
        "id": MapIcon.Storage_Facility,
        "apiName": "Storage Facility",
        "iconFileName": "StorageFacility",
        "displayName": "Storage Facility",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Logistics,
            MapIconTag.Storage,
            MapIconTag.Static,
            MapIconTag.Storage_Facility
        ]
    },

    {
        "id": MapIcon.Salvage_Field,
        "apiName": "Salvage Field",
        "iconFileName": "Salvage",
        "displayName": "Salvage Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Salvage,
            MapIconTag.Salvage_Field
        ]
    },
    {
        "id": MapIcon.Component_Field,
        "apiName": "Component Field",
        "iconFileName": "Components",
        "displayName": "Component Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Component,
            MapIconTag.Component_Field
        ]
    },
    {
        "id": MapIcon.Fuel_Field,
        "apiName": "Fuel Field",
        "iconFileName": "Fuel",
        "displayName": "Fuel Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Fuel,
            MapIconTag.Fuel_Field
        ]
    },
    {
        "id": MapIcon.Sulfur_Field,
        "apiName": "Sulfur Field",
        "iconFileName": "Sulfur",
        "displayName": "Sulfur Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Sulfur,
            MapIconTag.Sulfur_Field
        ]
    },
    {
        "id": MapIcon.Coal_Field,
        "apiName": "Coal Field",
        "iconFileName": "Coal",
        "displayName": "Coal Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Coal,
            MapIconTag.Coal_Field
        ]
    },
    {
        "id": MapIcon.Oil_Field,
        "apiName": "Oil Field",
        "iconFileName": "OilWell",
        "displayName": "Oil Field",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Field,
            MapIconTag.Resource_Oil,
            MapIconTag.Oil_Field
        ]
    },

    {
        "id": MapIcon.Salvage_Mine,
        "apiName": "Salvage Mine",
        "iconFileName": "SalvageMine",
        "displayName": "Salvage Mine",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Mine,
            MapIconTag.Resource_Salvage,
            MapIconTag.Salvage_Mine
        ]
    },
    {
        "id": MapIcon.Component_Mine,
        "apiName": "Component Mine",
        "iconFileName": "ComponentMine",
        "displayName": "Component Mine",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Mine,
            MapIconTag.Resource_Component,
            MapIconTag.Component_Mine
        ]
    },
    {
        "id": MapIcon.Sulfur_Mine,
        "apiName": "Sulfur Mine",
        "iconFileName": "SulfurMine",
        "displayName": "Sulfur Mine",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Mine,
            MapIconTag.Resource_Sulfur,
            MapIconTag.Sulfur_Mine
        ]
    },
    {
        "id": MapIcon.Oil_Rig,
        "apiName": "Oil Rig",
        "iconFileName": "FacilityMineOilRig",
        "displayName": "Oil Rig",
        "tags": [
            MapIconTag.Economy,
            MapIconTag.Resource,
            MapIconTag.Resource_Mine,
            MapIconTag.Resource_Oil,
            MapIconTag.Oil_Rig
        ]
    },

    {
        "id": MapIcon.Storm_Cannon,
        "apiName": "Storm Cannon",
        "iconFileName": "StormCannon",
        "displayName": "Storm Cannon",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Storm_Cannon]
    },
    {
        "id": MapIcon.Coastal_Gun,
        "apiName": "Coastal Gun",
        "iconFileName": "CoastalGun",
        "displayName": "Coastal Gun",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Static,
            MapIconTag.Defense,
            MapIconTag.Coastal_Gun
        ]
    },
    {
        "id": MapIcon.Mortar_House,
        "apiName": "Mortar House",
        "iconFileName": "MortarHouse",
        "displayName": "Mortar House",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Static,
            MapIconTag.Defense,
            MapIconTag.Mortar_House
        ]
    },
    {
        "id": MapIcon.Soul_Factory,
        "apiName": "Soul Factory",
        "iconFileName": "SoulFactory",
        "displayName": "Soul Factory",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Soul_Factory
        ]
    },

    {
        "id": MapIcon.Intel_Center,
        "apiName": "Intel Center",
        "iconFileName": "IntelCenter",
        "displayName": "Intel Center",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Intel_Center
        ]
    },
    {
        "id": MapIcon.Weather_Station,
        "apiName": "Weather Station",
        "iconFileName": "WeatherStation",
        "displayName": "Weather Station",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Weather_Station
        ]
    },
    {
        "id": MapIcon.Tech_Center,
        "apiName": "Tech Center",
        "iconFileName": "TechCenter",
        "displayName": "Tech Center",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Tech_Center
        ]
    },
    {
        "id": MapIcon.Observation_Tower,
        "apiName": "Observation Tower",
        "iconFileName": "ObservationTower",
        "displayName": "Observation Tower",
        "tags": [
            MapIconTag.Utility,
            MapIconTag.Observation_Tower
        ]
    },

    {
        "id": MapIcon.Rocket_Site,
        "apiName": "Rocket Site",
        "iconFileName": "RocketSite",
        "displayName": "Rocket Site",
        "tags": [
            MapIconTag.Rocket,
            MapIconTag.Rocket_Site
        ]
    },
    {
        "id": MapIcon.Rocket_Site_With_Rocket,
        "apiName": "Rocket Site With Rocket",
        "iconFileName": "RocketSiteArmed",
        "displayName": "Rocket Site With Rocket",
        "tags": [
            MapIconTag.Rocket,
            MapIconTag.Rocket_Site_With_Rocket
        ]
    },
    {
        "id": MapIcon.Rocket_Target,
        "apiName": "Rocket Target",
        "iconFileName": "RocketTarget",
        "displayName": "Rocket Target",
        "tags": [
            MapIconTag.Rocket,
            MapIconTag.Rocket_Target
        ]
    },
    {
        "id": MapIcon.Rocket_Ground_Zero,
        "apiName": "Rocket Ground Zero",
        "iconFileName": "RocketGroundZero",
        "displayName": "Rocket Ground Zero",
        "tags": [
            MapIconTag.Rocket,
            MapIconTag.Rocket_Ground_Zero
        ]
    },

    {        
        "id": MapIcon.World_Map_Tent,
        "apiName": "World Map Tent",
        "iconFileName": "WorldMapTent",
        "displayName": "World Map Tent",
        "tags": [
            MapIconTag.Static,
            MapIconTag.Utility,
            MapIconTag.World_Map_Tent
        ]
    },
    {
        "id": MapIcon.Travel_Tent,
        "apiName": "Travel Tent",
        "iconFileName": "TravelTent",
        "displayName": "Travel Tent",
        "tags": [
            MapIconTag.Static,
            MapIconTag.Utility,
            MapIconTag.Travel_Tent
        ]
    },
    {
        "id": MapIcon.Training_Area,
        "apiName": "Training Area",
        "iconFileName": "TrainingArea",
        "displayName": "Training Area",
        "tags": [
            MapIconTag.Static,
            MapIconTag.Utility,
            MapIconTag.Training_Area
        ]
    }
]

export { MapIcon, MapIconTag, mapIcons };