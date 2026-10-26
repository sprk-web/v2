const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, value));
  return element;
}

export function createSprkLogo() {
  const svg = createSvgElement('svg', {
    class: 'sprk-logo',
    viewBox: '0 0 48 48',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  const defs = createSvgElement('defs');
  const gradient = createSvgElement('linearGradient', {
    id: 'sprk-logo-gradient',
    x1: '0',
    y1: '0',
    x2: '1',
    y2: '1'
  });
  gradient.append(
    createSvgElement('stop', { offset: '0%', 'stop-color': '#22c1b5' }),
    createSvgElement('stop', { offset: '100%', 'stop-color': '#5572e8' })
  );
  defs.append(gradient);
  svg.append(defs);

  svg.append(
    createSvgElement('rect', {
      class: 'sprk-logo-tile',
      x: '2',
      y: '2',
      width: '44',
      height: '44',
      rx: '14',
      fill: 'url(#sprk-logo-gradient)'
    }),
    createSvgElement('path', {
      class: 'sprk-logo-book',
      d: 'M11 16.5c4.8-2.2 9.1-1.5 13 1.7 3.9-3.2 8.2-3.9 13-1.7v16c-4.8-2.2-9.1-1.5-13 1.7-3.9-3.2-8.2-3.9-13-1.7z',
      fill: 'none',
      stroke: '#fff',
      'stroke-width': '2.3',
      'stroke-linejoin': 'round'
    }),
    createSvgElement('path', {
      class: 'sprk-logo-page',
      d: 'M24 18.2v16',
      fill: 'none',
      stroke: '#fff',
      'stroke-width': '2',
      'stroke-linecap': 'round'
    }),
    createSvgElement('path', {
      class: 'sprk-logo-pencil',
      d: 'm30.4 12.3 2.8-2.8 4.1 4.1-2.8 2.8zM29.1 13.6l-2 6.1 6.1-2',
      fill: 'none',
      stroke: '#ffe7a3',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }),
    createSvgElement('path', {
      class: 'sprk-logo-spark sprk-logo-spark-one',
      d: 'M12 10v3m-1.5-1.5h3',
      fill: 'none',
      stroke: '#fff',
      'stroke-width': '1.7',
      'stroke-linecap': 'round'
    }),
    createSvgElement('circle', {
      class: 'sprk-logo-spark sprk-logo-spark-two',
      cx: '37',
      cy: '27',
      r: '1.2',
      fill: '#ffe7a3'
    })
  );

  return svg;
}
