import { useEffect, useState,useMemo, useContext, createContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GetAllCampus } from '../../../../store/apps/campus-management';

export const useCampusesList = (regionId) => {
  const dispatch = useDispatch();
  const { data, loaded } = useSelector((state) => state.campus);

  useEffect(() => {
    const filter = {
      pageNo: 1,
      pageSize: 10000,
      isEnabled: true,
      ...(regionId ? { regionId } : {}),
    };

    // ✅ Fetch only when needed
    if (!loaded || regionId) {
      dispatch(GetAllCampus(filter));
    }
  }, [dispatch, regionId, loaded]);

  // ✅ Memoized mapping
  const options = useMemo(() => {
    return [
      { value: "", label: "-- SELECT CAMPUS --" },
      ...data.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.cityName})`,
      })),
    ];
  }, [data]);

  return options;
};