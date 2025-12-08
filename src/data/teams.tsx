import tinycolor from "tinycolor2";

export enum Teams {
    Colonial = "Colonial",
    Warden = "Warden",
    Neutral = "Neutral",
    None = "None"
}

export enum Colors {
    Colonial = "#65875E",
    Warden = "#4A81B0",
    Neutral = "#ffffff",
    Debug = "#ff00ff"
}

interface TeamColorsStruct {
    base: string;
    light: string;
    dark: string;
    saturated: string;
}

const LIGHTEN_AMOUNT = 20;
const DARKEN_AMOUNT = 20;
const SATURATE_AMOUNT = 20;

export const TeamColors: Record<Teams, TeamColorsStruct> = {
    [Teams.Colonial]: {
        base: Colors.Colonial,
        light: tinycolor(Colors.Colonial).lighten(LIGHTEN_AMOUNT).toString(),
        dark: tinycolor(Colors.Colonial).darken(DARKEN_AMOUNT).toString(),
        saturated: tinycolor(Colors.Colonial).saturate(SATURATE_AMOUNT).toString()
    },
    [Teams.Warden]: {
        base: Colors.Warden,
        light: tinycolor(Colors.Warden).lighten(LIGHTEN_AMOUNT).toString(),
        dark: tinycolor(Colors.Warden).darken(DARKEN_AMOUNT).toString(),
        saturated: tinycolor(Colors.Warden).saturate(SATURATE_AMOUNT).toString()
    },
    [Teams.Neutral]: {
        base: Colors.Neutral,
        light: tinycolor(Colors.Neutral).lighten(LIGHTEN_AMOUNT).toString(),
        dark: tinycolor(Colors.Neutral).darken(DARKEN_AMOUNT).toString(),
        saturated: tinycolor(Colors.Neutral).saturate(SATURATE_AMOUNT).toString()
    },
    [Teams.None]: {
        base: Colors.Neutral,
        light: tinycolor(Colors.Neutral).lighten(LIGHTEN_AMOUNT).toString(),
        dark: tinycolor(Colors.Neutral).darken(DARKEN_AMOUNT).toString(),
        saturated: tinycolor(Colors.Neutral).saturate(SATURATE_AMOUNT).toString()
    },
}


interface TeamStruct {
    name: Teams;
    namePlural: string;
    colors: TeamColorsStruct;
    territoryColor: string;
    icon: string;
}

const teams: Array<TeamStruct> = [
    {
        name: Teams.Colonial,
        namePlural: `${Teams.Colonial}s`,
        colors: TeamColors[Teams.Colonial],
        territoryColor: tinycolor(Colors.Colonial).setAlpha(0.4).toString(),
        icon: new URL(`../images/logo_${Teams.Colonial}.png`, import.meta.url).href,
    },
    {
        name: Teams.Warden,
        namePlural: `${Teams.Warden}s`,
        colors: TeamColors[Teams.Warden],
        territoryColor: tinycolor(Colors.Warden).setAlpha(0.4).toString(),
        icon: new URL(`../images/logo_${Teams.Warden}.png`, import.meta.url).href,
    },
    {
        name: Teams.Neutral,
        namePlural: `${Teams.Neutral}s`,
        colors: TeamColors[Teams.Neutral],
        territoryColor: tinycolor(Colors.Neutral).setAlpha(0.4).toString(),
        icon: new URL(`../images/logo_${Teams.Neutral}.png`, import.meta.url).href,
    }
];

export function getTeams() {
    return teams;
}

export function getTeamData(team: string | Teams): TeamStruct | undefined {
    const teamName = mapTeamIdToName(team);
    return teams.find(t => t.name === teamName);
}

export function getTeamColors(team: string | Teams): TeamColorsStruct | undefined {
    const teamName = mapTeamIdToName(team);
    const foundTeam = teams.find(t => {
        t.name === teamName;
        return t.name === teamName;
    });
    return foundTeam ? foundTeam.colors : undefined;
}

export function getTeamIcon(owner: string | Teams): string {
    const teamName = mapTeamIdToName(owner);
    const foundTeam = teams.find(t => t.name === teamName);
    return foundTeam && foundTeam.icon ? foundTeam.icon : '';
}

export function mapTeamIdToName(teamId: string | Teams, plurl?: false): string {
    const teamID = teamId.toUpperCase();
    
    switch (teamID) {
        case 'COLONIAL':
        case 'COLONIALS':
            return `${Teams.Colonial}${plurl ? 's' : ''}`;
        case 'WARDEN':
        case 'WARDENS':
            return `${Teams.Warden}${plurl ? 's' : ''}`;
        default:
            return `${Teams.Neutral}`
    }
}