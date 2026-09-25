import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { GetChildAccount } from "../../../../store/apps/ho-coa";

const BANK_ACCOUNT_PARENT_ID = Number(process.env.REACT_APP_BANK_ACCOUNT_PARENT_ID || 86);

export const useHOBankAccount = (campusId) => {
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
            id: BANK_ACCOUNT_PARENT_ID,
            campusId: campusId ?? 0
          })
        ).unwrap(); // prevents stale payload

        const mappedData = (data ?? []).map(item => ({
          value: item.id,
          label: `${item.accountCode} - ${item.accountName}`
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
  }, [campusId, dispatch]);

  return options;
};
