import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
class Location extends BaseModel {}

Location.initialize(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lng: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        name: "lat_lng_index",
        unique: false,
        fields: ["lat", "lng"],
      },
    ],
  },
);

export default Location;
