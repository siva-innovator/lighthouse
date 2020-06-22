/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* globals self RectHelpers */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {LH.Artifacts.Rect} Rect */
/** @typedef {{width: number, height: number}} Size */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

class ElementScreenshotRenderer {
  /**
   * @param {Rect} elementRectInScreenshotCoords
   * @param {Size} renderContainerSizeInDisplayCoords
   * @param {Size} screenshotSize
   */
  static getScreenshotPositions(
      elementRectInScreenshotCoords, renderContainerSizeInDisplayCoords, screenshotSize) {
    //
    const elementRectCenter = RectHelpers.getRectCenterPoint(elementRectInScreenshotCoords);

    // Try to center clipped region.
    const screenshotLeftVisibleEdge = clamp(
      elementRectCenter.x - renderContainerSizeInDisplayCoords.width / 2,
      0, screenshotSize.width - renderContainerSizeInDisplayCoords.width
    );
    const screenshotTopVisisbleEdge = clamp(
      elementRectCenter.y - renderContainerSizeInDisplayCoords.height / 2,
      0, screenshotSize.height - renderContainerSizeInDisplayCoords.height
    );

    return {
      screenshot: {
        left: screenshotLeftVisibleEdge,
        top: screenshotTopVisisbleEdge,
      },
      clip: {
        left: elementRectInScreenshotCoords.left - screenshotLeftVisibleEdge,
        top: elementRectInScreenshotCoords.top - screenshotTopVisisbleEdge,
      },
    };
  }

  /**
   * @param {DOM} dom
   * @param {string} clipId
   * @param {{top: number, bottom: number, left: number, right: number}} _
   */
  static renderClipPath(dom, clipId, {top, bottom, left, right}) {
    const clipPathSvg = dom.createElement('div');
    clipPathSvg.innerHTML = `<svg height="0" width="0">
        <defs>
          <clipPath id='${clipId}' clipPathUnits='objectBoundingBox'>
            <polygon points="0,0  1,0  1,${top} 0,${top}" ></polygon>
            <polygon points="0,${bottom} 1,${bottom} 1,1 0,1" ></polygon>
            <polygon points="0,${top} ${left},${top} ${left},${bottom} 0,${bottom}" ></polygon>
            <polygon points="${right},${top} 1,${top} 1,${bottom} ${right},${bottom}" ></polygon>
          </clipPath>
        </defs>
      </svg>`;
    return clipPathSvg;
  }

  /**
   * @param {DOM} dom
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   */
  static _installBackgroundImageStyle(dom, fullPageScreenshot) {
    const containerEl = dom.find('.lh-container', dom.document());
    if (containerEl.querySelector('#full-page-screenshot-style')) return;

    const fullpageScreenshotUrl = fullPageScreenshot.data;
    const fullPageScreenshotStyleTag = dom.createElement('style');
    fullPageScreenshotStyleTag.id = 'full-page-screenshot-style';
    fullPageScreenshotStyleTag.innerText = `
      .lh-element-screenshot__image {
        background-image: url(${fullpageScreenshotUrl})
      }`;
    containerEl.appendChild(fullPageScreenshotStyleTag);
  }

  /**
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   */
  static installOverlayFeature(dom, templateContext, fullPageScreenshot) {
    ElementScreenshotRenderer._installBackgroundImageStyle(dom, fullPageScreenshot);

    const reportEl = dom.find('.lh-report', dom.document());
    const renderContainerSizeInDisplayCoords = {
      width: dom.document().documentElement.clientWidth - reportEl.getBoundingClientRect().left,
      height: dom.document().documentElement.clientHeight - reportEl.getBoundingClientRect().top,
    };
    for (const el of dom.document().querySelectorAll('.lh-element-screenshot')) {
      el.addEventListener('click', () => {
        const overlay = dom.createElement('div');
        overlay.classList.add('lh-element-screenshot__overlay');
        const elementRectInScreenshotCoords = {
          width: Number(el.getAttribute('rectWidth')),
          height: Number(el.getAttribute('rectHeight')),
          left: Number(el.getAttribute('rectLeft')),
          right: Number(el.getAttribute('rectRight')),
          top: Number(el.getAttribute('rectTop')),
          bottom: Number(el.getAttribute('rectBottom')),
        };
        overlay.appendChild(ElementScreenshotRenderer.render(
          dom,
          templateContext,
          elementRectInScreenshotCoords,
          fullPageScreenshot,
          renderContainerSizeInDisplayCoords
        ));
        overlay.addEventListener('click', () => {
          overlay.remove();
        });

        reportEl.appendChild(overlay);
      });
    }
  }

  /**
   * @param {LH.Artifacts.Rect} elementRectInScreenshotCoords
   * @param {Size} renderContainerSizeInDisplayCoords
   * @return {number}
   */
  static _computeZoomFactor(elementRectInScreenshotCoords, renderContainerSizeInDisplayCoords) {
    const targetClipToViewportRatio = 0.75;
    const zoomRatioXY = {
      x: renderContainerSizeInDisplayCoords.width / elementRectInScreenshotCoords.width,
      y: renderContainerSizeInDisplayCoords.height / elementRectInScreenshotCoords.height,
    };
    const zoomFactor = targetClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
    return Math.min(1, zoomFactor);
  }

  /**
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.Rect} elementRectInScreenshotCoords Region of screenshot to highlight.
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   * @param {Size} renderContainerSizeInDisplayCoords
   * @return {Element}
   */
  static render(dom, templateContext, elementRectInScreenshotCoords,
      fullPageScreenshot, renderContainerSizeInDisplayCoords) {
    //
    const tmpl = dom.cloneTemplate('#tmpl-lh-element-screenshot', templateContext);
    const containerEl = dom.find('.lh-element-screenshot', tmpl);

    containerEl.setAttribute('rectWidth', elementRectInScreenshotCoords.width.toString());
    containerEl.setAttribute('rectHeight', elementRectInScreenshotCoords.height.toString());
    containerEl.setAttribute('rectLeft', elementRectInScreenshotCoords.left.toString());
    containerEl.setAttribute('rectRight', elementRectInScreenshotCoords.right.toString());
    containerEl.setAttribute('rectTop', elementRectInScreenshotCoords.top.toString());
    containerEl.setAttribute('rectBottom', elementRectInScreenshotCoords.bottom.toString());

    // Zoom out when highlighted region takes up most of the viewport.
    // This provides more context for where on the page this element is.
    const zoomFactor =
      this._computeZoomFactor(elementRectInScreenshotCoords, renderContainerSizeInDisplayCoords);

    renderContainerSizeInDisplayCoords = {
      width: renderContainerSizeInDisplayCoords.width / zoomFactor,
      height: renderContainerSizeInDisplayCoords.height / zoomFactor,
    };
    renderContainerSizeInDisplayCoords.width =
      Math.min(fullPageScreenshot.width, renderContainerSizeInDisplayCoords.width);

    const positions = ElementScreenshotRenderer.getScreenshotPositions(
      elementRectInScreenshotCoords,
      renderContainerSizeInDisplayCoords,
      {width: fullPageScreenshot.width, height: fullPageScreenshot.height}
    );

    const contentEl = dom.find('.lh-element-screenshot__content', containerEl);
    contentEl.style.top = `-${renderContainerSizeInDisplayCoords.height * zoomFactor}px`;

    const image = dom.find('.lh-element-screenshot__image', containerEl);
    image.style.width = renderContainerSizeInDisplayCoords.width * zoomFactor + 'px';
    image.style.height = renderContainerSizeInDisplayCoords.height * zoomFactor + 'px';

    image.style.backgroundPositionY = -(positions.screenshot.top * zoomFactor) + 'px';
    image.style.backgroundPositionX = -(positions.screenshot.left * zoomFactor) + 'px';
    image.style.backgroundSize =
      `${fullPageScreenshot.width * zoomFactor}px ${fullPageScreenshot.height * zoomFactor}px`;

    const elMarker = dom.find('.lh-element-screenshot__element-marker', containerEl);
    elMarker.style.width = elementRectInScreenshotCoords.width * zoomFactor + 'px';
    elMarker.style.height = elementRectInScreenshotCoords.height * zoomFactor + 'px';
    elMarker.style.left = positions.clip.left * zoomFactor + 'px';
    elMarker.style.top = positions.clip.top * zoomFactor + 'px';

    const mask = dom.find('.lh-element-screenshot__mask', containerEl);
    const top = positions.clip.top / renderContainerSizeInDisplayCoords.height;
    const bottom = top + elementRectInScreenshotCoords.height / renderContainerSizeInDisplayCoords.height;
    const left = positions.clip.left / renderContainerSizeInDisplayCoords.width;
    const right = left + elementRectInScreenshotCoords.width / renderContainerSizeInDisplayCoords.width;

    const clipId = `clip-${top}-${bottom}-${left}-${right}`;
    mask.style.clipPath = 'url(#' + clipId + ')';
    mask.style.width = renderContainerSizeInDisplayCoords.width * zoomFactor + 'px';
    mask.style.height = renderContainerSizeInDisplayCoords.height * zoomFactor + 'px';

    mask.appendChild(
      ElementScreenshotRenderer.renderClipPath(dom, clipId, {top, bottom, left, right})
    );

    return containerEl;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
