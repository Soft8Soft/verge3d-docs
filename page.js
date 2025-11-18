
let list = null;
const pageProperties = [];
const titles = {};
const categoryElements = [];

function loadJSON(path, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType('application/json');
    xobj.open('GET', path, true);

    xobj.onreadystatechange = function() {
        if (xobj.readyState === 4 && xobj.status === 200) {
            callback(JSON.parse(xobj.responseText));
        }
    };
    xobj.send(null);
}

function onDocumentLoad() {

    // handle code snippets formatting

    var elements = document.getElementsByTagName('code');

    for (var i = 0; i < elements.length; i++) {

        var element = elements[i];

        var text = element.textContent.trim();
        text = text.replace(/^    /gm, '');

        element.textContent = text;
    }


    // syntax highlighting

    const pathname = window.location.pathname;
    const styleBase = document.createElement('link');
    styleBase.href = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/prettify.css';
    styleBase.rel = 'stylesheet';

    const styleCustom = document.createElement('link');
    styleCustom.href = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/verge3d.css';
    styleCustom.rel = 'stylesheet';

    document.head.appendChild(styleBase);
    document.head.appendChild(styleCustom);

    const prettify = document.createElement('script');
    prettify.src = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/prettify.js';

    prettify.onload = function() {

        const elements = document.getElementsByTagName('code');

        for (let i = 0; i < elements.length; i++) {
            const e = elements[i];
            if (!e.className.includes('raw'))
                e.className += ' prettyprint';
        }

        prettyPrint();

    };

    document.head.appendChild(prettify);


    const language = document.getElementsByTagName('html')[0].lang;

    const localList = list[language];

    for (const section in localList) {

        const categories = localList[section];

        for (const category in categories) {

            const pages = categories[category];

            for (const pageName in pages) {

                const pageURL = pages[pageName] + '.html';
                const linkElement = document.querySelector('nav#panel [href="' + pageURL + '"]');
                if (!linkElement)
                    continue;

                // Gather the main properties for the current subpage
                pageProperties.push({
                    pageName: pageName,
                    section: section,
                    category: category,
                    pageURL: pageURL,
                    linkElement: linkElement
                });

                // Gather the document titles (used for easy access on browser navigation)
                titles[pageURL] = pageName;

            }

            // Gather the category elements for easy access on filtering

            const categoryContent = document.getElementById(category.replace(/[' ]/g, '_'));
            if (categoryContent)
                categoryElements.push(categoryContent);
        }
    }


    // hamburger button (on mobile devices)

    document.getElementById('expandButton').onclick = function(event) {
        event.preventDefault();
        panel.classList.toggle('collapsed');
        document.body.classList.toggle('unscrollable');
    };


    // package flavors checkers

    let uncheckedFlavorsSaved = [];
    if (localStorage.v3dDocUncheckedFlavors)
        uncheckedFlavorsSaved = JSON.parse(localStorage.v3dDocUncheckedFlavors);

    document.querySelectorAll('label.filter-flavor-item input').forEach(checkbox => {
        // restore unchecked
        if (uncheckedFlavorsSaved.includes(checkbox.dataset.flavor))
            checkbox.checked = false;

        // assign event listener
        checkbox.addEventListener('change', () => {
            updateFilter();

            // save unchecked
            const uncheckedFlavors = getUncheckedFlavors();
            localStorage.setItem('v3dDocUncheckedFlavors', JSON.stringify(uncheckedFlavors));
        })
    });

    updateFilter();


    // search/filter input field

    const filterInput = document.getElementById('filterInput');

    filterInput.addEventListener('input', () => {
        updateFilter();
    });

    // filter esc

    filterInput.addEventListener('keydown', (event) => {
        if (event.keyCode == 27) {
            filterInput.value = '';
            updateFilter();
        }
    });

    // filter clear button

    document.getElementById('clearFilterButton').addEventListener('click', (event) => {
        event.preventDefault();

        filterInput.value = '';
        updateFilter();
    });

};


document.addEventListener('DOMContentLoaded', function() {
    loadJSON('list.json', function(loadedList) {
        list = loadedList;
        onDocumentLoad();
    });
}, false);

function restorePanelScroll() {
    if (localStorage.v3dDocScrollPosition) {
        var panel = document.querySelector('#panel');

        if (panel.clientHeight > 100)
            panel.scrollTop = localStorage.getItem('v3dDocScrollPosition');
    }
}

function savePanelScroll() {
    const v3dDocScrollPosition = document.querySelector('#panel').scrollTop;
    localStorage.setItem('v3dDocScrollPosition', v3dDocScrollPosition);
}


if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
    // Safari
    document.addEventListener('DOMContentLoaded', () => {
        restorePanelScroll();
        document.querySelector('#panel').addEventListener('scroll', savePanelScroll);
    });
} else {
    // Chrome etc
    document.fonts.addEventListener('loadingdone', restorePanelScroll);
    window.addEventListener('unload', savePanelScroll);
}


function getUncheckedFlavors() {
    return Array.from(document.querySelectorAll('label.filter-flavor-item input:not(:checked)'))
            .map(elem => elem.dataset.flavor);
}

// filtering

function updateFilter() {

    const filterInput = document.getElementById('filterInput');
    const searchLine = new RegExp(filterInput.value, 'gi');
    const uncheckedFlavors = getUncheckedFlavors();

    pageProperties.forEach(prop => {

        let pageName = prop.pageName;
        const linkElement = prop.linkElement;

        const itemClassList = linkElement.parentElement.classList;
        // third value from URL, e.g. manual/en/blender/... => blender
        const pageFlavorMatch = prop.pageURL.match(/^\w+\/\w+\/(\w+)/)[1];

        const showItem = !uncheckedFlavors.includes(pageFlavorMatch);
        const filterResults = pageName.match(searchLine);

        if (showItem && filterResults && filterResults.length > 0) {

            // accentuate matching characters

            for (let i = 0; i < filterResults.length; i++) {

                const result = filterResults[i];

                if (result !== '') {
                    pageName = pageName.replace(result, '<b>' + result + '</b>');
                }

            }

            itemClassList.remove('hidden');
            linkElement.innerHTML = pageName;

        } else {

            // hide all non-matching page names

            itemClassList.add('hidden');

        }

    });

    displayFilteredPanel();

}

function displayFilteredPanel() {

    // Show/hide categories depending on their content
    // First check if at least one page in this category is not hidden

    categoryElements.forEach(function(category) {

        var pages = category.children;
        var pagesLength = pages.length;
        var sectionClassList = category.parentElement.classList;

        var hideCategory = true;

        for (var i = 0; i < pagesLength; i++) {

            var pageClassList = pages[i].classList;

            if (!pageClassList.contains('hidden')) {

                hideCategory = false;

            }

        }

        // If and only if all page names are hidden, hide the whole category

        if (hideCategory) {

            sectionClassList.add('hidden');

        } else {

            sectionClassList.remove('hidden');

        }

    });

}

window.addEventListener('DOMContentLoaded', (event) => {
    if (window.location.href.indexOf('/ru/') > -1) {
        document.body.querySelector('nav#panel').style.padding = '0px 10px 0px 15px';
        document.body.querySelectorAll('nav#panel ul').forEach(e => { e.style.marginLeft = '5px' });
        document.body.querySelectorAll('strong, dt').forEach(e => { e.style.fontSize = '17px' });
    }
});
