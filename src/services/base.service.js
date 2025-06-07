import {
  Sequelize,
  Op,
  literal,
  where as sequelizeWhere,
  cast,
  col,
} from "sequelize";

class BaseService {
  static Model = null;

  static getOptions(queryParams = {}, customOptions = {}) {
    const {
      page, // Default handled by parseInt/logic below
      limit, // Default handled by parseInt/logic below
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
      searchIn,
      startDate,
      endDate,
      pagination, // Destructure the pagination flag
    } = queryParams;

    const usedKeys = [
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "search",
      "searchIn",
      "startDate",
      "endDate",
      "pagination", // Add pagination to usedKeys
    ];

    const options = {};
    let applyQueryPagination = true;

    // Check the pagination queryParam
    if (
      pagination === false ||
      (typeof pagination === "string" && pagination.toLowerCase() === "false")
    ) {
      applyQueryPagination = false;
    }
    options.applyQueryPagination = applyQueryPagination; // Pass this intent along

    // 1. Pagination options for the query
    if (applyQueryPagination) {
      let parsedPage = parseInt(page, 10);
      let parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedPage) || parsedPage <= 0) parsedPage = 1;
      if (isNaN(parsedLimit) || parsedLimit <= 0) parsedLimit = 10; // Default limit

      options.limit = parsedLimit;
      options.offset = (parsedPage - 1) * parsedLimit;
    }
    // If applyQueryPagination is false, options.limit and options.offset are NOT set.

    // 2. Sorting
    if (sortBy) {
      const sortField = sortBy.includes(".")
        ? col(sortBy)
        : [sortBy, sortOrder.toUpperCase()];
      options.order = [[...[].concat(sortField)]]; // Handles if sortField is an array or single item
    }

    // 3. Searching/Filtering
    const searchWhere = {};
    if (search && searchIn) {
      const searchFields = Array.isArray(searchIn)
        ? searchIn
        : searchIn
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);

      if (searchFields.length > 0 && Op && col && cast && sequelizeWhere) {
        // Ensure Op and helpers are defined
        searchWhere[Op.or] = searchFields.map((field) => {
          const isNumeric = [
            "id",
            "someIntegerField",
            "someNumericField",
          ].includes(field);

          if (field.includes(".")) {
            return sequelizeWhere(cast(col(field), "TEXT"), {
              [Op.iLike]: `%${search}%`,
            });
          }
          return isNumeric
            ? sequelizeWhere(cast(col(field), "TEXT"), {
                [Op.iLike]: `%${search}%`,
              })
            : {
                [field]: {
                  [Op.iLike]: `%${search}%`,
                },
              };
        });
      }
    }

    // 4. Date Filtering
    const dateWhere = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate && Op) dateWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate && Op) dateWhere.createdAt[Op.lte] = new Date(endDate); // Consider end of day for endDate if needed
    }

    // 5. Clean queryParams of used fields
    const remainingQueryParams = { ...queryParams };
    usedKeys.forEach((key) => {
      delete remainingQueryParams[key];
    });

    // 6. Merge filters
    const where = {
      ...searchWhere,
      ...dateWhere,
      ...remainingQueryParams, // Allow direct key filtering from remaining queryParams
    };

    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    // 7. Merge with custom options (custom options override defaults)
    Object.assign(options, customOptions);

    return options;
  }

  static async get(id, filters = {}, queryOptionsPassed = {}) {
    // queryOptionsPassed is typically the result from an external call to getOptions
    if (!this.Model) {
      throw new Error(
        "BaseService.Model is not defined. Please set it in the subclass.",
      );
    }

    if (!id) {
      // Ensure queryOptions has applyQueryPagination, defaulting to true if not set by getOptions directly
      const queryOptions = {
        applyQueryPagination: true, // Default if not present
        ...queryOptionsPassed,
      };

      const { count, rows } = await this.Model.findAndCountAll(queryOptions);

      let returnOnlyArray = false;

      // Condition 1: The 'filters' parameter for this 'get' call explicitly disables pagination structure.
      if (
        filters &&
        (filters.pagination === false ||
          (typeof filters.pagination === "string" &&
            String(filters.pagination).toLowerCase() === "false"))
      ) {
        returnOnlyArray = true;
      }
      // Condition 2: The query itself was not paginated (as determined by getOptions).
      else if (queryOptions.applyQueryPagination === false) {
        returnOnlyArray = true;
      }

      if (returnOnlyArray) {
        return rows; // Return just the data array
      }

      // --- If we reach here, create a paginated response structure ---
      let totalItems = count;

      // Adjust totalItems if grouping was used and `count` is an array of group counts
      if (queryOptions.group && Array.isArray(count)) {
        if (count.length > 0 && typeof count[0].count !== "undefined") {
          totalItems = count.reduce(
            (sum, current) => sum + (Number(current.count) || 0),
            0,
          );
        } else {
          totalItems = count.length; // Number of groups if count is an array of grouped objects without a .count property directly
        }
      } else if (typeof count !== "number") {
        // Fallback for unexpected count formats (e.g. object, or array not from grouping)
        console.warn(
          "BaseService.get: 'count' from findAndCountAll was not a number or a recognized grouped array. Defaulting totalItems.",
        );
        totalItems = Array.isArray(rows) ? rows.length : 0;
      }

      const limitFromOptions = queryOptions.limit;
      const offsetFromOptions = queryOptions.offset;

      // If query was not paginated (applyQueryPagination:false), all items are fetched.
      // Pagination object then describes this single page of all items.
      const itemsPerPage =
        queryOptions.applyQueryPagination &&
        typeof limitFromOptions === "number" &&
        limitFromOptions > 0
          ? limitFromOptions
          : totalItems > 0
            ? totalItems
            : 1; // if no pagination or invalid limit, itemsPerPage is totalItems

      const currentPage =
        queryOptions.applyQueryPagination &&
        typeof offsetFromOptions === "number" &&
        itemsPerPage > 0
          ? Math.floor(offsetFromOptions / itemsPerPage) + 1
          : 1;

      let totalPages =
        itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;
      if (totalItems === 0) totalPages = 0;

      return {
        result: rows,
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage, // Or `limit: limitFromOptions` if you prefer
        },
      };
    }

    // Handling fetching a single document by ID
    // The original code used 'this.Model.findDocById(id)'
    // Assuming standard Sequelize, findByPk is preferred.
    // queryOptionsPassed can be used here for includes, attributes, etc.
    const document = await this.Model.findByPk(id, queryOptionsPassed);
    // if (!document) { throw new Error('Document not found'); /* or handle as needed */ }
    return document; // Or { result: document } for consistency if desired
  }

  static async getDoc(filters, options = {}) {
    return await this.Model.findDoc(filters, options);
  }

  static async getDocById(id, allowNull = false) {
    return await this.Model.findDocById(id, allowNull);
  }

  static async create(data) {
    const createdDoc = await this.Model.create(data);
    return createdDoc;
  }

  static async update(id, data) {
    const doc = await this.Model.findDocById(id);

    doc.updateFields(data);
    await doc.save();

    return doc;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);

    //TODO: Delete functionality has to be implemented;
  }
}

export default BaseService;
