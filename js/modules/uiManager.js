import { showStatus } from '../utils/helpers.js';

export default class UIManager {
    constructor() {
        this.setupBackButtons();
    }
    
    setupBackButtons() {
        document.querySelectorAll('.back-button').forEach(button => {
            button.addEventListener('click', () => {
                this.navigateToPage('mainPage');
            });
        });
    }
    
    navigateToPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.add('next');
        });
        
        const targetPage = document.getElementById(pageId);
        targetPage.classList.remove('next');
    }
    
    showNotification(message, type = 'success') {
        showStatus(message, type);
    }
}