import { useEffect, useState,useMemo, useContext, createContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GetSessions } from '../../../../store/apps/sessions';

export const useAcademicSessions = () => {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((state) => state.sessions);

  useEffect(() => {
    dispatch(GetSessions());
  }, [dispatch]);

  return useMemo(() => {
    if (!data) return [{ value: "", label: "SELECT SESSION" }];

    // 1. Map and Sort the data descending
    const formattedSessions = data
      .map((item) => ({
        value: item.id,
        label: item.name,
      }))
      .sort((a, b) => {
        // Sorting by value (ID) descending. 
        // Use b.label.localeCompare(a.label) if you want to sort by Name string.
        return b.value - a.value; 
      });

    // 2. Return with SELECT SESSION at index 0
    return [
      { value: "", label: "SELECT SESSION" },
      ...formattedSessions
    ];
  }, [data]);
};