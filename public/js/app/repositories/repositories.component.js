angular.module('RepositoriesModule', ['ngRoute']);

angular.
module('RepositoriesModule').
component('repoList', {
  template: 'Repo List component will go here',
  controller: ['$routeParams',
    function RepoListController($routeParams) {
      console.log('inside repolist controller');
    }
  ]
});