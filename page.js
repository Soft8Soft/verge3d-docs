
var href = window.location.href;

// COMPAT: redirect older hash links
if (/#(manual|api|examples)/.test(href)) {
    var section = /#(manual|api|examples)\//.exec(href)[1].toString();

    href = href.replace('#'+section, section+'/en');

    if (window.location.hash.indexOf('.') > -1) {
        var href_start = href.substring(0, href.lastIndexOf("."));
        var href_end = href.substring(href.lastIndexOf(".") + 1, href.length);
        href = href_start + '.html#' + href_end;
    } else
        href += '.html';

    window.location.replace(href);
}

var pageProperties = {};
var titles = {};
var categoryElements = [];

function onDocumentLoad(event) {

    var pathname = window.location.pathname;

    var clearFilterButton = document.getElementById('clearFilterButton');
    var expandButton = document.getElementById('expandButton');
    var filterInput = document.getElementById('filterInput');

    // handle code snippets formatting

    var elements = document.getElementsByTagName('code');

    for (var i = 0; i < elements.length; i++) {

        var element = elements[i];

        var text = element.textContent.trim();
        text = text.replace(/^    /gm, '');

        element.textContent = text;
    }


    // Syntax highlighting

    var styleBase = document.createElement('link');
    styleBase.href = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/prettify.css';
    styleBase.rel = 'stylesheet';

    var styleCustom = document.createElement('link');
    styleCustom.href = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/threejs.css';
    styleCustom.rel = 'stylesheet';

    document.head.appendChild(styleBase);
    document.head.appendChild(styleCustom);

    var prettify = document.createElement('script');
    prettify.src = pathname.substring(0, pathname.indexOf('docs') + 4) + '/prettify/prettify.js';

    prettify.onload = function() {

        var elements = document.getElementsByTagName('code');

        for (var i = 0; i < elements.length; i++) {

            var e = elements[i];
            e.className += ' prettyprint';

        }

        prettyPrint();

    };

    document.head.appendChild(prettify);

    // TODO
    var language = 'en';

    var localList = list[language];

    for (var section in localList) {

        var categories = localList[section];

        for (var category in categories) {

            var pages = categories[category];

            for (var pageName in pages) {

                var pageURL = pages[pageName] + '.html';
                var linkElement = document.querySelector('[href="' + pageURL + '"]');
                if (!linkElement)
                    continue;

                // Gather the main properties for the current subpage
                pageProperties[pageName] = {
                   section: section,
                   category: category,
                   pageURL: pageURL,
                   linkElement: linkElement
                };

                // Gather the document titles (used for easy access on browser navigation)
                titles[pageURL] = pageName;

            }

            // Gather the category elements for easy access on filtering

            var categoryContent = document.getElementById(category.replace(/[' ]/g, '_'));
            if (categoryContent)
                categoryElements.push(categoryContent);
        }
    }


    // Functionality for hamburger button (on small devices)

    expandButton.onclick = function(event) {

        event.preventDefault();
        panel.classList.toggle('collapsed');

    };


    // Functionality for search/filter input field

    filterInput.oninput = function(event) {

        updateFilter();

    };

    // Functionality for filter clear button

    clearFilterButton.onclick = function(event) {

        event.preventDefault();

        filterInput.value = '';
        updateFilter();

    };

};


document.addEventListener('DOMContentLoaded', onDocumentLoad, false);


window.addEventListener('load', function() {
    if (localStorage.scrollPosition) {
        var panel = document.querySelector('#panel');

        if (panel.clientHeight > 100)
            panel.scrollTop = localStorage.getItem('scrollPosition');
    }
});

window.addEventListener('unload', function() {
    var scrollPosition = document.querySelector('#panel').scrollTop;
    localStorage.setItem('scrollPosition', scrollPosition);
});



  // Filtering

function updateFilter() {

    var regExp = new RegExp(filterInput.value, 'gi');

    for (var pageName in pageProperties) {

        var linkElement = pageProperties[pageName].linkElement;
        var categoryClassList = linkElement.parentElement.classList;
        var filterResults = pageName.match(regExp);

        if (filterResults && filterResults.length > 0) {

            // Accentuate matching characters

            for (var i = 0; i < filterResults.length; i++) {

                var result = filterResults[i];

                if (result !== '') {
                    pageName = pageName.replace(result, '<b>' + result + '</b>');
                }

            }

            categoryClassList.remove('hidden');
            linkElement.innerHTML = pageName;

        } else {

            // Hide all non-matching page names

            categoryClassList.add('hidden');

        }

    }

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
    if (window.location.href.indexOf('/ru/') > -1)
        document.body.style.fontFamily = 'Source Sans Pro, sans-serif';
});
