<template>
  <svg class="d-none d-lg-block mt-3 mx-auto" :width="svgWidth" :height="svgHeight">
    <g>
      <path id="country" :d="countryPath" stroke="#000" stroke-width="1" />
      <circle v-for="radar in visibleRadars" :id="'circle-radar-' + radar.odimCode" :key="radar.odimCode" :class="getRadarExtraClass(radar)" r="3px" :cx="projectRadar(radar)[0]" :cy="projectRadar(radar)[1]" @click="$emit('click-circle', radar.odimCode)">
        <b-popover :target="'circle-radar-' + radar.odimCode" triggers="hover">
          {{ radar.displayLabel }}
        </b-popover>
      </circle>
    </g>
  </svg>
</template>

<script lang="ts">
import Vue from "vue";
import * as d3 from "d3";
import { GroupedRadarInterface, RadarInterface } from "@/CrowTypes";
import basemap from "@/geojson_basemap.json";

export default Vue.extend({
  name: "SiteSelectorMap",
  props: {
    sites: {
      type: Array as () => GroupedRadarInterface[],
      default: () => []
    },
    selectedRadarCode: {
      type: String,
      default: ""
    }
  },
  data: function () {
    return {
      svgWidth: 300,
      svgHeight: 400,

      xPadding: 15,
      yPadding: 15,

      countriesFeatures: basemap as d3.ExtendedFeatureCollection
    }
  },
  computed: {
    radarsFeatures: function (): d3.ExtendedFeatureCollection {
      let geojson = { type: "FeatureCollection", features: [] } as d3.ExtendedFeatureCollection

      this.visibleRadars.forEach(r => {
        let feature = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [r.longitude, r.latitude]
          },
          "properties": null
        } as d3.ExtendedFeature;

        geojson.features.push(feature);
      })

      return geojson
    },
    visibleRadars: function (): RadarInterface[] {
      // Flat array of radars based on the "sites" prop
      let r: RadarInterface[] = []
      this.sites.forEach(e => {
        r = r.concat(e.options)
      })

      // Filter out radars that have a shownOnMap property set to false
      return r.filter(r => r.showOnMap !== false);
    },
    projection: function (): d3.GeoProjection {
      return d3.geoMercator()
        .fitExtent([[this.xPadding, this.yPadding], [this.svgWidth - this.xPadding, this.svgHeight - this.yPadding]], this.radarsFeatures);
    },

    pathGenerator: function (): d3.GeoPath {
      return d3.geoPath().projection(this.projection);
    },

    countryPath: function (): string | null {
      return this.pathGenerator(this.countriesFeatures)
    }
  },
  methods: {
    projectRadar(radar: RadarInterface): [number, number] | null {
      return this.projection([radar.longitude, radar.latitude])
    },
    getRadarExtraClass(radar: RadarInterface): string {
      return radar.odimCode === this.selectedRadarCode ? "radar-circle-selected" : "radar-circle-unselected"
    }

  },
});
</script>

<style scoped>
.radar-circle-unselected {
  fill: white;
}

.radar-circle-unselected:hover {
  fill: #007bff;
}

.radar-circle-selected {
  fill: #007bff;
}

#country {
  stroke: #6c757d; /* cf. text-muted */
  fill: transparent;
}
</style>
