/**
 * Template Processor
 * Handles loading and processing of HTML templates, CSS, and JavaScript
 * with enhanced CSS extraction and management
 */
class TemplateProcessor {
  constructor() {
    this.templates = {};
    this.cssChunks = {};
    this.cssOrder = []; 
    this.readyCallbacks = [];
    this.loadedComponents = new Set();
    this.cssScope = {};
    this.pendingTemplates = 0;
    this.initialized = false;
    this.processed = false;
    this.processedEvent = new CustomEvent('templateProcessorReady', { bubbles: true });
  }

  /**
   * Initialize the template processor
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Wait for complete DOM content loaded before processing
    if (document.readyState === 'complete') {
      this.processInitialDOM();
    } else {
      // Only add this listener once
      document.addEventListener('DOMContentLoaded', () => {
        this.processInitialDOM();
      }, { once: true });
    }
  }
  
  /**
   * Process the initial DOM content
   */
  processInitialDOM() {
    if (this.processed) return;
    
    // Set initial pending templates counter
    this.pendingTemplates = 1; // Start with 1 for the main document
    
    // Extract any embedded CSS in the initial document
    this.extractEmbeddedCSS(document.body);
    
    // Process any template markers in the initial HTML
    this.processTemplateMarkers(document.body);
    
    // Mark the main document as processed
    this.templateProcessed();
  }

  /**
   * Mark a template as processed and check if all are complete
   */
  templateProcessed() {
  this.pendingTemplates--;

  if (this.pendingTemplates <= 0 && !this.processed) {
    this.processed = true;
    // All templates processed, execute callbacks
    this.executeReadyCallbacks();

    // Use requestAnimationFrame to wait until after the browser repaints.
    requestAnimationFrame(() => {
      document.dispatchEvent(this.processedEvent);
      console.log('Template processing complete - All templates loaded and processed');
    });
  }
}


  /**
   * Register a callback to be executed when the DOM and all templates are ready
   * @param {Function} callback - Function to execute
   * @param {string} [componentId] - Optional component ID to associate with callback
   */
  ready(callback, componentId = null) {
    this.readyCallbacks.push({
      callback,
      componentId
    });

    // If already processed and no component ID or component is loaded, execute immediately
    if (this.processed && (!componentId || this.loadedComponents.has(componentId))) {
      callback();
    }
  }

  /**
   * Execute all registered ready callbacks
   */
  executeReadyCallbacks() {
    const callbacks = [...this.readyCallbacks];
    // Only execute callbacks for components that are loaded or have no component ID
    callbacks.forEach(item => {
      if (!item.componentId || this.loadedComponents.has(item.componentId)) {
        try {
          item.callback();
        } catch (e) {
          console.error('Error in template processor callback:', e);
        }
      }
    });
  }

  /**
   * Execute callbacks for a specific component
   * @param {string} componentId - Component identifier
   */
  executeComponentCallbacks(componentId) {
    this.loadedComponents.add(componentId);
    const callbacks = this.readyCallbacks.filter(item => 
      item.componentId === componentId || !item.componentId
    );
    
    callbacks.forEach(item => {
      try {
        item.callback();
      } catch (e) {
        console.error(`Error in callback for component ${componentId}:`, e);
      }
    });
  }

  /**
   * Process template markers in the HTML
   * @param {HTMLElement} element - Container element to search for template markers
   */
  processTemplateMarkers(element) {
    const html = element.innerHTML;
    const templateRegex = /\{\{template:\s*([^}]+)\}\}/g;
    
    let match;
    const promises = [];
    let markerFound = false;
    
    while ((match = templateRegex.exec(html)) !== null) {
      markerFound = true;
      const templatePath = match[1].trim();
      this.pendingTemplates++; // Increment pending templates counter
      promises.push(this.loadTemplate(templatePath));
    }

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        this.replaceTemplateMarkers(element);
      }).catch(error => {
        console.error('Error loading templates:', error);
        this.templateProcessed(); // Mark as processed even on error
      });
    } else if (!markerFound) {
      // No templates found in this element
      this.templateProcessed();
    }
  }

  /**
   * Load a template from a file path
   * @param {string} path - Path to the template file
   * @returns {Promise} Promise that resolves when template is loaded
   */
  async loadTemplate(path) {
    if (this.templates[path]) {
      this.templateProcessed(); // Mark as processed if already loaded
      return Promise.resolve(this.templates[path]);
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${path}`);
      }
      
      const html = await response.text();
      
      // Process the template before storing it
      const processedTemplate = this.processTemplateContent(html, path);
      this.templates[path] = processedTemplate;
      
      this.templateProcessed(); // Mark this template as processed
      return processedTemplate;
    } catch (error) {
      console.error(`Error loading template ${path}:`, error);
      this.templateProcessed(); // Mark as processed even on error
      return '';
    }
  }
  
  /**
   * Process template content to extract CSS and clean up the HTML
   * @param {string} html - Template HTML content
   * @param {string} path - Template path for identification
   * @returns {string} Processed template HTML
   */
  processTemplateContent(html, path) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract CSS from the template
    this.extractCSS(tempDiv, path);
    
    // Return the cleaned template HTML
    return tempDiv.innerHTML;
  }

  /**
   * Extract CSS from template HTML
   * @param {HTMLElement} element - Element containing the template content
   * @param {string} path - Template path for identification
   */
  extractCSS(element, path) {
    // 1. Extract CSS from data-css elements
    const cssElements = element.querySelectorAll('[data-css]');
    let cssContent = Array.from(cssElements)
      .map(element => element.textContent)
      .join('\n');
    
    // Remove the data-css elements from the DOM
    cssElements.forEach(el => {
      el.parentNode?.removeChild(el);
    });
    
    // 2. Extract CSS from style tags
    const styleElements = element.querySelectorAll('style:not([data-preserve])');
    cssContent += '\n' + Array.from(styleElements)
      .map(element => {
        const content = element.textContent;
        // Remove the style element from the template to avoid duplication
        element.parentNode?.removeChild(element);
        return content;
      })
      .join('\n');
    
    // 3. Extract inline styles from elements with style attribute
    const inlineStyleElements = element.querySelectorAll('[style]:not([data-preserve-style])');
    if (inlineStyleElements.length > 0) {
      let inlineStyles = '';
      const componentId = path ? path.split('/').pop().replace(/\.[^.]+$/, '') : 'main';
      
      Array.from(inlineStyleElements).forEach((element, index) => {
        const className = `tpc-${componentId}-${index}`;
        const styleContent = element.getAttribute('style');
        
        // Add a unique class to the element
        element.classList.add(className);
        
        // Create a CSS rule for this inline style
        inlineStyles += `.${className} { ${styleContent} }\n`;
        
        // Remove the inline style
        element.removeAttribute('style');
      });
      
      cssContent += '\n' + inlineStyles;
    }
    
    // 4. Apply component scoping if requested
    if (element.querySelector('[data-css-scope]')) {
      const componentId = path ? path.split('/').pop().replace(/\.[^.]+$/, '') : 'main';
      cssContent = this.scopeCSS(cssContent, componentId);
      this.cssScope[path] = componentId;
    }
    
    // 5. Store CSS with priority information
    if (cssContent.trim()) {
      const priorityEl = element.querySelector('[data-css-priority]');
      const priority = priorityEl ? parseInt(priorityEl.getAttribute('data-css-priority') || '0') : 0;
      
      if (!this.cssChunks[path]) {
        this.cssOrder.push({ path, priority });
      }
      
      this.cssChunks[path] = {
        content: this.minifyCSS(cssContent),
        priority
      };
      
      // Update the stylesheet
      this.updateStylesheet();
    }
  }

  /**
   * Extract embedded CSS from any elements in the document
   * @param {HTMLElement} rootElement - Root element to scan for embedded CSS
   */
  extractEmbeddedCSS(rootElement) {
    // Extract CSS from all data-css elements and remove them
    const cssElements = rootElement.querySelectorAll('[data-css]');
    let cssContent = '';
    
    cssElements.forEach(element => {
      cssContent += element.textContent + '\n';
      element.parentNode?.removeChild(element);
    });
    
    // Extract CSS from style tags
    const styleElements = rootElement.querySelectorAll('style:not([data-preserve])');
    
    styleElements.forEach(style => {
      cssContent += style.textContent + '\n';
      
      // Option 1: Remove the style tag
      style.parentNode?.removeChild(style);
      
      // Option 2: Keep but empty (uncomment if needed)
      // style.setAttribute('data-processed', 'true');
      // style.textContent = '/* CSS moved to head */';
    });
    
    // Process elements with inline styles
    const inlineStyleElements = rootElement.querySelectorAll('[style]:not([data-preserve-style])');
    if (inlineStyleElements.length > 0) {
      let inlineStyles = '';
      
      Array.from(inlineStyleElements).forEach((element, index) => {
        const className = `tpc-inline-${index}`;
        const styleContent = element.getAttribute('style');
        
        // Add a unique class to the element
        element.classList.add(className);
        
        // Create a CSS rule for this inline style
        inlineStyles += `.${className} { ${styleContent} }\n`;
        
        // Remove the inline style
        element.removeAttribute('style');
      });
      
      cssContent += inlineStyles;
    }
    
    // Add the extracted CSS to the stylesheet
    if (cssContent.trim()) {
      this.cssChunks['embedded'] = {
        content: this.minifyCSS(cssContent),
        priority: 0 // Base priority for embedded CSS
      };
      
      if (!this.cssOrder.find(item => item.path === 'embedded')) {
        this.cssOrder.push({ path: 'embedded', priority: 0 });
      }
      
      this.updateStylesheet();
    }
  }

  /**
   * Scope CSS to a specific component to prevent style leakage
   * @param {string} css - CSS content to scope
   * @param {string} componentId - Component identifier for scoping
   * @returns {string} Scoped CSS
   */
  scopeCSS(css, componentId) {
    // Simple CSS parser to add component prefix to selectors
    // This is a basic implementation; a robust solution would use a proper CSS parser
    const scopeSelector = `.component-${componentId}`;
    
    return css.replace(/([^{]+)({[^}]+})/g, (match, selector, rules) => {
      // Skip if this is an at-rule
      if (selector.trim().startsWith('@')) {
        return match;
      }
      
      // Split multiple selectors and add scope to each
      const selectors = selector.split(',').map(s => {
        s = s.trim();
        // Skip selectors that are already scoped or target root elements
        if (s.includes(`component-${componentId}`) || s === 'html' || s === 'body') {
          return s;
        }
        return `${scopeSelector} ${s}`;
      });
      
      return selectors.join(', ') + rules;
    });
  }

  /**
   * Simple CSS minification
   * @param {string} css - CSS content to minify
   * @returns {string} Minified CSS
   */
  minifyCSS(css) {
    return css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove whitespace
      .replace(/\s+/g, ' ')
      .replace(/\s*({|}|;|,|:)\s*/g, '$1')
      .replace(/\s*>\s*/g, '>')
      .trim();
  }

  /**
   * Update or create the combined stylesheet
   */
  updateStylesheet() {
    let stylesheet = document.getElementById('template-processor-styles');
    
    if (!stylesheet) {
      stylesheet = document.createElement('style');
      stylesheet.id = 'template-processor-styles';
      document.head.appendChild(stylesheet);
    }
    
    // Sort CSS chunks by priority
    const sortedOrder = [...this.cssOrder].sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by original order
      return this.cssOrder.indexOf(a) - this.cssOrder.indexOf(b);
    });
    
    // Combine CSS in priority order
    const combinedCSS = sortedOrder
      .map(item => this.cssChunks[item.path]?.content || '')
      .filter(content => content.length > 0)
      .join('\n');
    
    stylesheet.textContent = combinedCSS;
  }

  /**
   * Replace template markers with actual template content
   * @param {HTMLElement} element - Container element to replace markers in
   */
  replaceTemplateMarkers(element) {
    const html = element.innerHTML;
    let processedHtml = html;
    
    const templateRegex = /\{\{template:\s*([^}]+)\}\}/g;
    let match;
    let templateFound = false;
    
    while ((match = templateRegex.exec(html)) !== null) {
      templateFound = true;
      const templatePath = match[1].trim();
      const templateContent = this.templates[templatePath] || '';
      
      let wrappedContent = templateContent;
      
      // If the template has scoped CSS, wrap content in a div with the scope class
      if (this.cssScope[templatePath]) {
        wrappedContent = `<div class="component-${this.cssScope[templatePath]}">${templateContent}</div>`;
      }
      
      processedHtml = processedHtml.replace(match[0], wrappedContent);
    }
    
    if (templateFound && processedHtml !== html) {
      element.innerHTML = processedHtml;
      
      // Process scripts in the element
      this.processScripts(element);
      
      // Extract any CSS in the newly inserted content
      this.extractEmbeddedCSS(element);
      
      // Check for nested templates
      this.processTemplateMarkers(element);
    }
  }

  /**
   * Process and execute scripts in an element
   * @param {HTMLElement} element - Element containing scripts to process
   */
  processScripts(element) {
    const scripts = element.querySelectorAll('script[data-execute]');
    
    scripts.forEach(originalScript => {
      const script = document.createElement('script');
      
      // Copy attributes
      Array.from(originalScript.attributes).forEach(attr => {
        if (attr.name !== 'data-execute') {
          script.setAttribute(attr.name, attr.value);
        }
      });
      
      // Set content and execute
      script.textContent = originalScript.textContent;
      originalScript.parentNode.replaceChild(script, originalScript);
    });
  }
}


/**
 * Initialize the template processor and set up global hooks
 */
(function() {
  // Create global instance as soon as script loads
  window.templateProcessor = new TemplateProcessor();
  
  // Initialize when script is loaded but wait for document to be ready
  if (document.readyState === 'complete') {
    window.templateProcessor.init();
  } else {
    window.addEventListener('load', function() {
      window.templateProcessor.init();
    }, { once: true });
  }
  
  // Export helper functions to global scope
  window.templateProcessorReady = function(callback) {
    if (window.templateProcessor) {
      window.templateProcessor.ready(callback);
    } else {
      // Fallback if templateProcessor isn't loaded yet
      document.addEventListener('templateProcessorReady', callback);
    }
  };
  
  // Component-specific ready callback
  window.componentReady = function(callback, componentId = null) {
    if (window.templateProcessor) {
      window.templateProcessor.ready(callback, componentId);
    } else {
      console.warn('Template processor not initialized');
    }
  };
  
  // Notify any waiting scripts that might have loaded before us
  document.dispatchEvent(new CustomEvent('templateProcessorLoaded'));
})();