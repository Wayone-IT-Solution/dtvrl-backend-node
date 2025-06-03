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
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
      searchIn,
      startDate,
      endDate,
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
    ];

    const options = {};

    // 1. Pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    options.limit = parseInt(limit, 10);
    options.offset = offset;

    // 2. Sorting
    if (sortBy) {
      const sortField = sortBy.includes(".")
        ? col(sortBy)
        : [sortBy, sortOrder.toUpperCase()];
      options.order = [[...[].concat(sortField)]];
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

      if (searchFields.length > 0) {
        searchWhere[Op.or] = searchFields.map((field) => {
          const isNumeric = [
            "id",
            "someIntegerField",
            "someNumericField",
          ].includes(field);

          // Handle nested fields like "Broker.name"
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
      if (startDate) dateWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) dateWhere.createdAt[Op.lte] = new Date(endDate);
    }

    // 5. Clean queryParams of used fields
    usedKeys.forEach((key) => delete queryParams[key]);

    // 6. Merge filters
    const where = {
      ...searchWhere,
      ...dateWhere,
      ...queryParams, // allow direct key filtering
    };

    options.where = where;

    // 7. Merge with custom options (custom options override defaults)
    Object.assign(options, customOptions);

    return options;
  }

  static async get(id, filters, options = {}) {
    if (!id) {
      return await this.Model.findAll({
        where: filters,
        ...options,
      });
    }
    return await this.Model.findDocById(id);
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
