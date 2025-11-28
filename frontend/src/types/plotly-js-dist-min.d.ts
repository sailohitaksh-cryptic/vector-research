// frontend/src/types/plotly-js-dist-min.d.ts

// 1) Plotly JS runtime module
declare module 'plotly.js-dist-min' {
  const Plotly: any;
  export default Plotly;
}

// 2) React Plotly factory module
declare module 'react-plotly.js/factory' {
  import type Plotly from 'plotly.js-dist-min';
  import type { ComponentType, CSSProperties } from 'react';

  interface PlotlyComponentProps {
    data?: any[];
    layout?: any;
    config?: any;
    style?: CSSProperties;
    className?: string;
    [key: string]: any;
  }

  export default function createPlotlyComponent(
    plotly: typeof Plotly
  ): ComponentType<PlotlyComponentProps>;
}
