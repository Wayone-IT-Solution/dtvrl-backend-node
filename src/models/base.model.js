import { Model } from "sequelize";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import sequelize from "#configs/database";
import { session } from "#middlewares/requestSession";
import { uploadFile } from "#configs/awsS3";

class BaseModel extends Model {
  static excludedBranchModels = ["Branch", "City", "State", "Country", "Auth"];

  /**
   * Initialize the model with the given model definition and options.
   * @param {object} modelDefinition - The model definition
   * @param {object} options - The options for the model
   */
  static initialize(modelDefinition, options) {
    const modifiedModelDefinition = this.modifyModelDefinition(modelDefinition);

    this.init(
      {
        ...modifiedModelDefinition,
        //createdBy: {
        //  type: DataTypes.INTEGER,
        //  allowNull: true,
        //  filterable: true,
        //},
        //updatedBy: {
        //  type: DataTypes.INTEGER,
        //  allowNull: true,
        //  filterable: true,
        //},
      },
      {
        hooks: {},
        ...options,
        sequelize,
        timestamps: true,
        paranoid: true,
      },
    );
  }

  static updatedName() {
    return this.name;
  }

  static modifyModelDefinition(modelDefinition) {
    return Object.entries(modelDefinition).reduce((acc, [key, value]) => {
      acc[key] = {
        ...value,
        filterable: value.filterable ?? true,
        searchable: value.searchable ?? true,
        ...(modelDefinition[key]["references"]
          ? {
              references: modelDefinition[key]["references"],
              validate: { isInt: { msg: `Invalid ${key}` } },
            }
          : {}),
      };
      return acc;
    }, {});
  }

  static async find(filters, options = {}) {
    const {
      search = "",
      searchKey = "",
      page = 1,
      limit = 10,
      sortKey,
      sortDir,
      pagination,
      ...restFilters
    } = filters;

    const { fields = ["*"], lookups } = options;

    const tableName = this.getTableName();
    const attributes = this.rawAttributes;

    const whereClauses = [];
    const replacements = {};

    // Validate and apply filterable fields
    Object.keys(restFilters).forEach((key) => {
      if (
        [
          "search",
          "searchKey",
          "page",
          "limit",
          "sortKey",
          "sortDir",
          "pagination",
        ].includes(key)
      )
        return;

      if (key !== "id" && (!attributes[key] || !attributes[key].filterable)) {
        throw new AppError({
          status: false,
          message: `Field "${key}" is not filterable`,
          httpStatus: httpStatus.BAD_REQUEST,
        });
      }

      const paramKey = `filter_${key}`;

      if (filters[key] === null) {
        whereClauses.push(`"${tableName}"."${key}" IS NULL`);
      } else {
        whereClauses.push(`"${tableName}"."${key}" = :${paramKey}`);
        replacements[paramKey] = filters[key];
      }
    });

    // Search key validation
    if (search && searchKey) {
      if (!attributes[searchKey] || !attributes[searchKey].searchable) {
        throw new AppError({
          status: false,
          message: `Field "${searchKey}" is not searchable`,
          httpStatus: httpStatus.BAD_REQUEST,
        });
      }

      const paramKey = `search_0`;
      whereClauses.push(`"${tableName}"."${searchKey}" ILIKE :${paramKey}`);
      replacements[paramKey] = `%${search}%`;
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    // Sorting
    const defaultOrder = [["createdAt", "DESC"]];
    const sortColumn =
      sortKey && attributes[sortKey]
        ? `"${tableName}"."${sortKey}"`
        : `"${tableName}"."${defaultOrder[0][0]}"`;
    const sortDirection =
      sortDir?.toUpperCase() === "ASC" ? "ASC" : defaultOrder[0][1];
    const orderSQL = `ORDER BY ${sortColumn} ${sortDirection}`;

    // Pagination
    const offset = (page - 1) * limit;
    const limitSQL =
      pagination !== "false" ? `LIMIT ${limit} OFFSET ${offset}` : "";

    // Join Clauses (supporting chained joins via `via`)
    let joinClauses = "";
    const lookupAliases = new Set(); // For field quoting

    if (lookups && Array.isArray(lookups)) {
      lookups.forEach(({ from, as, localField, foreignField, via }) => {
        const source = via || tableName;
        joinClauses += ` LEFT JOIN "${from}" AS "${as}" ON "${source}"."${localField}" = "${as}"."${foreignField}"`;
        lookupAliases.add(as);
      });
    }

    function autoQuoteField(field) {
      if (field === "*") return "*";

      // Already quoted or special (e.g., COUNT(*))
      if (/["()]/.test(field) && !/\s+AS\s+/i.test(field)) return field;

      // Handle aliasing with "AS"
      if (/\s+AS\s+/i.test(field)) {
        const [rawField, alias] = field.split(/\s+AS\s+/i);
        const quotedField = autoQuoteField(rawField);

        const quotedAlias = /[A-Z]/.test(alias) ? `"${alias}"` : alias;
        return `${quotedField} AS ${quotedAlias}`;
      }

      // No table prefix — assume it's from the main table
      if (!field.includes(".")) {
        return `"${tableName}"."${field}"`;
      }

      // Handle table.field pattern
      if (/^[a-zA-Z_]+\.[a-zA-Z_]+$/.test(field)) {
        const [table, col] = field.split(".");

        // Validate table alias
        if (table !== tableName && !lookupAliases.has(table)) {
          throw new AppError({
            status: false,
            message: `Invalid table alias in field: "${field}"`,
            httpStatus: httpStatus.BAD_REQUEST,
          });
        }

        return `"${table}"."${col}"`;
      }

      return `"${field}"`;
    }

    const quotedFields = fields.map(autoQuoteField);

    // Final Queries
    const dataQuery = `
    SELECT ${quotedFields.join(",")}
    FROM "${tableName}"
    ${joinClauses}
    ${whereSQL}
    ${orderSQL}
    ${limitSQL}
  `;

    const countQuery = `
    SELECT COUNT(*) AS count
    FROM "${tableName}"
    ${joinClauses}
    ${whereSQL}
  `;

    const result = await this.sequelize.query(dataQuery, {
      replacements,
      type: this.sequelize.QueryTypes.SELECT,
    });

    let count = result.length;
    if (pagination !== "false") {
      const [countResult] = await this.sequelize.query(countQuery, {
        replacements,
        type: this.sequelize.QueryTypes.SELECT,
      });
      count = parseInt(countResult.count, 10);
    }

    return pagination !== "false" && pagination !== false
      ? {
          result,
          total: count,
        }
      : result;
  }

  static async findDocById(id, options = {}) {
    this.idChecker(id);

    return await this.findDoc({ id }, options);
  }

  static async findDoc(filters, options = {}) {
    const { allowNull = false } = options;

    delete options.allowNull;

    const doc = await this.findOne({
      where: filters,
      ...options,
    });

    if (doc || allowNull) {
      return doc;
    }
    throw new AppError({
      status: false,
      message: `${this.updatedName()} not found`,
      httpStatus: httpStatus.NOT_FOUND,
    });
  }

  static async create(data, options = {}) {
    const createdDocument = await super.create(data);
    return createdDocument;
  }

  async save() {
    const transaction = session.get("transaction");

    const files = session.get("files");
    if (files?.length) {
      const attributes = this.constructor.rawAttributes;

      const filesPromises = [];
      files.forEach((file) => {
        if (attributes[file.fieldname] && attributes[file.fieldname].file) {
          const fileName = `${this.constructor.updatedName()}/${file.fieldname}/${this.dataValues.createdAt}`;
          filesPromises.push(uploadFile(fileName, file.buffer, file.mimetype));
        }
      });

      if (filesPromises.length) {
        try {
          const fileLinks = await Promise.all(filesPromises);
        } catch (err) {
          //WARN: Handle file upload revert here
        }
      }
    }

    if (!transaction) {
      throw new AppError({
        status: false,
        message: "Failed to fetch transaction",
        httpStatus: httpStatus.INTERNAL_SERVER_ERROR,
      });
    }
    await super.save({ transaction });
    return this;
  }

  static getSearchableFields(allowedFields) {
    return Object.keys(allowedFields).filter(
      (field) => allowedFields[field].searchable,
    );
  }

  static getFilterableFields(allowedFields) {
    return Object.keys(allowedFields).filter(
      (field) => allowedFields[field].filterable,
    );
  }

  static rawFields() {
    return this.getAttributes();
  }

  /**
   * Update a record by its ID.
   * @param {any} id - The ID of the record to update
   * @param {Object} updates - The updates to apply to the record
   * @return {Promise<Object>} The updated record
   */
  static async updateById(id, updates) {
    this.idChecker(id);
    const [updatedCount, updatedRecord] = await this.update(updates, {
      where: { id },
    });

    const doc = await this.findByPk(id);

    if (updatedCount !== 1) {
      throw new AppError({
        status: false,
        httpStatus: httpStatus.NOT_FOUND,
        message: `${this.name} not found`,
      });
    }
    return updatedRecord;
  }

  updateFields(updates) {
    for (let i in updates) {
      this[i] = updates[i];
    }
  }

  /**
   * Delete a record by its ID.
   *
   * @param {any} id - The ID of the record to delete
   * @return {Promise<Object>} The updated record
   */
  static async deleteById(id) {
    this.idChecker(id);
    const time = new Date();
    const [updatedCount, updatedRecord] = await this.update(
      { deletedAt: time },
      {
        where: { id, deletedAt: null },
        individualHooks: true,
      },
    );
    if (updatedCount !== 1 || !updatedRecord || !updatedRecord.length) {
      throw new AppError({
        status: false,
        httpStatus: httpStatus.NOT_FOUND,
        message: `${this.name} not found`,
      });
    }
    return updatedRecord;
  }

  static idChecker(id) {
    if (!id || isNaN(id)) {
      throw new AppError({
        status: false,
        httpStatus: httpStatus.NOT_FOUND,
        message: `Invalid or missing ${this.name} id`,
      });
    }
  }

  static objectValidator(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

export default BaseModel;
