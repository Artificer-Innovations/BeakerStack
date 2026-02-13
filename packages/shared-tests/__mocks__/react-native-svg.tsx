import React from 'react';

// Default export for Svg (import Svg from 'react-native-svg')
const Svg = ({ children, ...props }: any) => (
  <div data-testid='svg-icon' {...props}>
    {children}
  </div>
);

// Named exports
export const Circle = (props: any) => (
  <div data-testid='svg-circle' {...props} />
);
export const Path = (props: any) => <div data-testid='svg-path' {...props} />;
export const Rect = (props: any) => <div data-testid='svg-rect' {...props} />;
export const Line = (props: any) => <div data-testid='svg-line' {...props} />;

// Default export
export default Svg;
