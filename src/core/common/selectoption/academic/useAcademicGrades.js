import { useEffect, useState,useMemo, useContext, createContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GetGrades } from '../../../../store/apps/grades';

export const useAcademicGrades = () => {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((state) => state.grades);
  useEffect(() => {
    dispatch(GetGrades());
  }, [dispatch]);
  const filtermap = data.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  return [{ value: 0, label: "-- SELECT ACCOUNT --" }, ...filtermap];
}