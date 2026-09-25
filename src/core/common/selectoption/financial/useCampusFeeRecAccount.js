import { useEffect, useState, useMemo, useContext, createContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GetChildAccount } from '../../../../store/apps/campus-coa';

const FEE_RECEIPT_HEAD_ID = Number(process.env.REACT_APP_FEE_RECEIPT_HEAD_ID || 88);

export const useCampusFeeRecAccount = () => {
  const dispatch = useDispatch();

  const [options, setOptions] = useState([
    { value: "", label: "-- SELECT ACCOUNT --" }
  ]);

  useEffect(() => {
    // clear previous options immediately when campus changes
    setOptions([{ value: "", label: "-- SELECT ACCOUNT --" }]);

    const fetchData = async () => {
      try {
        const data = await dispatch(
          GetChildAccount({
            id: FEE_RECEIPT_HEAD_ID
          })
        ).unwrap(); // prevents stale payload

        const mappedData = (data ?? []).map(item => ({
          value: item.id,
          label: item.accountName
        }));

        setOptions([
          { value: "", label: "-- SELECT ACCOUNT --" },
          ...mappedData
        ]);
      } catch (error) {
        //API failed / 404 → keep dropdown empty
        setOptions([{ value: "", label: "-- SELECT ACCOUNT --" }]);
      }
    };

    fetchData();
  }, [dispatch]);

  return options;
};