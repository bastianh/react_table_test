/** @jsx React.DOM */

var APP =
    React.createClass({displayName: 'APP',
        getDefaultProps: function () {
            return {
                class: 'table table-condensed table-bordered',
                currentPage: 1,
                itemsPerPage: 10
            };
        },
        componentWillReceiveProps: function (nextProps) {
            //console.log("props", nextProps);
        },
        render: function () {
            //console.log("APP", this.props);

            var itemsPerPage = this.props.itemsPerPage,
                currentPage = this.props.currentPage,
                data = this.props.data;

            // currentpage & itemsperpage
            data = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
                React.DOM.table({className: "tabelle " + this.props.class, id: this.props.id},
                    TableHead({scope: this.props.scope, columns: this.props.config.columns}),
                    TableBody({columns: this.props.config.columns, data: data})
                )
                );
        }
    });

var TableHead = React.createClass({displayName: 'TableHead',
    getInitialState: function () {
        // naming it initialX clearly indicates that the only purpose
        // of the passed down prop is to initialize something internally
        return {
            sortField: this.props.scope.sortField.substring(1),
            sortDir: this.props.scope.sortField.charAt(0)
        };
    },
    handleClick: function (field, event) {
        var scope = this.props.scope,
            sortDir = this.state.sortDir;

        if (this.state.sortField == field) {
            sortDir = sortDir == "+" ? "-" : "+";
        }

        this.setState({ sortField: field, sortDir: sortDir });
        scope.$apply(function () {
            scope.sortField = sortDir + field;
        });
        return event.preventDefault();
    },
    render: function () {
        return (
            React.DOM.thead(null,
                React.DOM.tr(null,
                    _.map(this.props.columns, function (col) {
                        var className = col.header_class ? col.header_class + " " : "";
                        if (this.state.sortField === col.field) {
                            className += this.state.sortDir == "+" ? "sorting_asc" : "sorting_desc";
                        } else {
                            className += "sorting";
                        }
                        return React.DOM.th({className: className, onClick: this.handleClick.bind(this, col.field), style: col.header_style, key: col.field}, col.displayName);
                    }, this)
                )
            )
            );
    }
});

var TableBody = React.createClass({displayName: 'TableBody',
    render: function () {
        //console.log("tbody", this.props);
        return (
            React.DOM.tbody(null,
                _.map(this.props.data, function (row, i) {
                    return TableRow({key: 'row_' + i, row: row, columns: this.props.columns});
                }, this)
            )
            );
    }
});

var TableRow = React.createClass({displayName: 'TableRow',
    render: function () {
        //console.log("row", this.props);
        return (
            React.DOM.tr(null,
                _.map(this.props.columns, function (col) {
                    return this.transferPropsTo(TableCell({column: col}));
                }, this)
            )
            );
    }
});

var TableCell = React.createClass({displayName: 'TableCell',

    render: function () {
        var col = this.props.column;
        //console.log("row", col.field, this.props.row[col.field]);
        return (
            React.DOM.td({key: this.props.key + '_' + col.field, className: col.class},
                col.format ? col.format(this.props.row[col.field], this.props.row, col) : this.props.row[col.field]
            )
            );
    }

});


angular.module('armaApp')
    .directive('tabelle', function () {
        return {
            restrict: 'E',
            scope: {
                data: '=',
                id: '@',
                config: '=',
                totalItems: '=',
                ngModel: '=',
                itemsPerPage: '=',
                filter: '=',
                sortField: '='
            },
            link: function (scope, elm, attrs) {
                scope.internalData = data;
                /*
                 scope.$watch('data', function () {
                 console.log("data changed")
                 });
                 */
                scope.$watch('sortField', function () {
                    if (!scope.sortField) return;
                    //console.log("SORT DATA", scope.sortField);
                    var sortFieldName = scope.sortField.substring(1);
                    var fieldConfig = _.find(scope.config.columns, {'field': sortFieldName});
                    var sortFunction = fieldConfig.sort || function (fieldValue) {
                        switch (typeof fieldValue) {
                            case 'object': // sonderfall null ?
                                return "";
                            case 'string':
                                return fieldValue.toLowerCase();
                            default:
                                return fieldValue;
                        }
                    };
                    var data = _.sortBy(scope.internalData, function (row) {
                        return sortFunction(row[sortFieldName], row)
                    });
                    if (scope.sortField.charAt(0) == "-") {
                        data = data.reverse();
                    }
                    scope.internalData = data;
                });

                scope.$watch('filter', function () {
                    //console.log("filter", scope.filter);
                    // filter
                    if (scope.filter) {
                        scope.internalData = _.filter(scope.data, function (row) {
                            var accepted = false;
                            _.each(row, function (k, v) {
                                if (k && !accepted) {
                                    if (typeof k == "string") {
                                        k = k.toLowerCase();
                                    } else {
                                        k = k.toString();
                                    }
                                    if (_.contains(k, this)) {
                                        accepted = true;
                                    }
                                }
                            }, scope.filter.toLowerCase());
                            return accepted;
                        }, this);
                    } else {
                        scope.internalData = scope.data;
                    }

                });

                var myCallback = function () {
                    console.info("RENDER", scope);

                    if (!scope.sortField) { // no sortfield, then set it and stop render this time
                        if (scope.config.default_sort) {
                            scope.sortField = "+" + scope.config.default_sort;
                        } else {
                            scope.sortField = "+" + scope.config.columns[0].field;
                        }
                        console.info("RETURN");
                        return;
                    }

                    scope.totalItems = scope.internalData.length;

                    React.renderComponent(
                        APP({
                            data: scope.internalData,
                            id: scope.id,
                            config: scope.config,
                            itemsPerPage: scope.itemsPerPage,
                            currentPage: scope.ngModel,
                            scope: scope
                        }),
                        elm[0]
                    );
                };

                /* angular 1.2 schlecht .. mycallback wird öfter aufgerufen */
                scope.$watch('ngModel', myCallback);
                scope.$watch('itemsPerPage', myCallback);
                scope.$watch('internalData', myCallback);

                /* angular 1.3 besser aber nicht mit eve kompatibel .)
                 scope.$watchGroup(['internalData', 'ngModel', 'itemsPerPage'], function (newValues, oldValues, scope) {


                 });
                 */
            }
        };
    });