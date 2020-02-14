// TODO: move field position (hardcoded constants) to config.js
import config from "./config";
import * as d3 from "d3"; // TODO: Remove D3 dependency from this file so only the "chart" modules need it
import moment from "moment-timezone";

function formatMoment(moment, showTimeAs, timeAxisFormat) {
    // Format the timestamp passed as argument, according to timezone and timeAxisFormat
    return moment.tz(showTimeAs).format(timeAxisFormat);
}

function formatTimestamp(ts, showTimeAs, timeAxisFormat) {
    // Format the timestamp passed as argument, according to timezone and timeAxisFormat
    return formatMoment(moment(ts), showTimeAs, timeAxisFormat);
}

function makeSafeForCSS(name) {
    return name.replace(/[^a-z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) return '-';
        if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
        return '__' + ('000' + c.toString(16)).slice(-4);
    });
}

function metersToFeet(meters) {
    return meters * 3, 281;
}

function parseFloatOrZero(string) {
    let val = parseFloat(string);
    if (isNaN(val)) {
        return 0;
    } else {
        return val;
    }
}

function readVtps(responseString) {
    let d = responseString.split("\n");
    d = d.splice(config.vtpsFormat.numHeaderLines); // Remove 4 header lines
    // The file is also terminated by a blank line, which cause issues.
    d.pop()

    let r = d.map(function (row) {
        // There are NaN values everywhere in the data, D3 don't know how to interpret them
        // For now, we consider a non-numbers to mean 0

        return {
            datetime: moment.utc(row.substring(0, 13), "YYYYMMDD HHmm").valueOf(),
            height: +parseInt(row.substring(14, 18)),
            dd: parseFloat(row.substring(47, 52)),
            ff: parseFloat(row.substring(41, 46)),
            dens: parseFloatOrZero(row.substring(76, 82)),
            sd_vvp: parseFloat(row.substring(53, 59))
        };
    });

    return r;
}

function integrateProfile(data, altMin = 0, altMax = Infinity, interval = 200, vvpThresh = 2, alpha = NaN) {
    // TODO: interval and vvpThresh should actually be derived from data/metadata itself
    // TODO: extract the data - could be improved by using data itself as input
    // TODO: return other properties than mtr

    // Check input arguments
    if (!(typeof altMin == 'number') || !(typeof altMax == 'number' || altMax == Infinity)) {
        throw "'altMin'/'altMax' need to be nunmeric";
    }
    if (!(isNaN(alpha) || !(typeof alpha == 'number'))) {
        throw "'alpha' needs to be numeric or Nan";
    }
    if (altMax <= altMin) {
        console.log("'altMin' should be smaller than 'altMax'");
    }

    // Get height ranges
    const altMinMaxFromData = d3.extent(data, d => d.height);
    altMin = Math.max(altMin, altMinMaxFromData[0]);
    altMax = Math.min(altMax, altMinMaxFromData[1] + interval); // Interval added to get upper bound of height layer

    // Filter data on requested heights
    data = data.filter(d => d.height >= altMin & d.height <= altMax);

    // Filter data on sd_vvp values above sd_vvp threshold
    data = data.filter(d => d.sd_vvp >= vvpThresh);
    if (data.length == 0) {
        return NaN;
    }

    // Extract dd, ff and dens values
    let ff = data.map(x => x.ff);
    let dens = data.map(x => x.dens);
    let eta = data.map(x => x.eta);

    // Calculate the cosFactor
    let cosFactor = [];
    if (isNaN(alpha)) {
        cosFactor = data.map(x => 1. + 0. * x.dd);
    } else {
        cosFactor = data.map(x => Math.cos(x.dd - alpha) * Math.PI / 180);
    }

    // Calculate mtr
    let mtr = 0.001 * interval * cosFactor.map((e, i) => e * ff[i] * dens[i] * 3.6)
        .filter(x => !Number.isNaN(x))
        .reduce((a, b) => a + b, 0);

    // Calculate rtr
    let rtr = 0.001 * interval * cosFactor.map((e, i) => e * ff[i] * eta[i] * 3.6)
        .filter(x => !Number.isNaN(x))
        .reduce((a, b) => a + b, 0);

    // Calculate vid
    let vid = 0.001 * interval * dens
        .filter(x => !Number.isNaN(x))
        .reduce((a, b) => a + b, 0);

    // Calculate vir
    let vir = 0.001 * interval * eta
        .filter(x => !Number.isNaN(x))
        .reduce((a, b) => a + b, 0);

    return ({ "mtr": mtr, "rtr": rtr, "vid": vid, "vir": vir })
}

export default { readVtps, integrateProfile, metersToFeet, makeSafeForCSS, formatTimestamp, formatMoment } 