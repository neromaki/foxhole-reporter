enum MapFlag {
    IsVictoryBase = "0x01",
    IsHomeBase = "0x02",
    IsBuildSite = "0x04",
    IsScorched = "0x10",
    IsTownClaimed = "0x20",
}

interface MapFlagStruct {
    name: MapFlag;
    apiName: string;
    displayName: string;
}

const mapFlags: Array<MapFlagStruct> = [
    {name: MapFlag.IsVictoryBase, apiName: "0x01", displayName: "Victory Base"},
    {name: MapFlag.IsHomeBase, apiName: "0x02", displayName: "Home Base"},
    {name: MapFlag.IsBuildSite, apiName: "0x04", displayName: "Build Site"},
    {name: MapFlag.IsScorched, apiName: "0x10", displayName: "Scorched"},
    {name: MapFlag.IsTownClaimed, apiName: "0x20", displayName: "Town Claimed"},
];

export { MapFlag };
export default mapFlags;