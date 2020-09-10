---
---

// This has been implemented, but some formatted articles will invalidate the search. The reason is currently unknown,
// and is currently found that the premature appearance of code snippets in the article may cause the error.
window.onload = function () {
  var sjs = SimpleJekyllSearch({
    searchInput: document.getElementById('searchbar'),
    resultsContainer: document.getElementById('search-results'),
    json: '{{ "/search.json" | relative_url }}',
    searchResultTemplate: '<a href="{url}" target="_self">{title}</a>',
    noResultsText: '',
  })
  // Hack ios safari unfocus. Specially deal with the opening of safari and chrome browsers.
  if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent))
    document.body.firstElementChild.tabIndex = 1
  var $labelGroup = document.querySelector('.posts-labelgroup')
  var $searchbar = document.getElementById('searchbar')
  var $postLabel = document.getElementById('posts-label')
  var $searchResults = document.querySelector('.search-results')
  var labelWidth = $postLabel.scrollWidth
  $postLabel.style.width = labelWidth + 'px'
  // The following are listeners for some mouse interaction events in the search box. For example, the mouse clicks on
  // the search box, the mouse moves on the search option, and the mouse leaves.
  $labelGroup.addEventListener(
    'click',
    function (e) {
      $searchResults.style.display = null
      $postLabel.style.width = '0'
      $labelGroup.setAttribute('class', 'posts-labelgroup focus-within')
      $searchbar.focus()
      e.stopPropagation()
    },
    false
  )
  $labelGroup.addEventListener('mouseleave', function () {
    document.body.onclick = searchCollapse
  })
  var searchCollapse = function (e) {
    $searchResults.style.display = 'none'
    $labelGroup.setAttribute('class', 'posts-labelgroup')
    $postLabel.style.width = labelWidth + 'px'
    document.body.onclick = null
  }
}
