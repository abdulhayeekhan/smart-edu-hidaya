import { useEffect, useState } from "react";
import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL;
const BANK_ACCOUNT_PARENT_ID = Number(process.env.REACT_APP_BANK_ACCOUNT_PARENT_ID || 86);

export const useCampusBankAccount = (campusId) => {
  const [options, setOptions] = useState([
    { value: "", label: "-- SELECT ACCOUNT --" }
  ]);

  useEffect(() => {
    // Clear previous options immediately when campus changes
    setOptions([{ value: "", label: "-- SELECT ACCOUNT --" }]);

    const fetchData = async () => {
      try {
        const finalCampusId = campusId ?? 0;
        let list = [];

        // 1. Fetch child accounts from Campus Chart of Accounts using parent ID
        try {
          const res = await axios.get(
            `${baseURL}/api/BChartOfAccount/getchildaccount?id=${BANK_ACCOUNT_PARENT_ID}${finalCampusId ? `&campusId=${finalCampusId}` : ''}`
          );
          list = res?.data?.data || res?.data || [];
        } catch (e) {
          list = [];
        }

        // 2. Fallback to GetChildAccountByLevel with parentId & accountLevel=4 if needed
        if (!Array.isArray(list) || list.length === 0) {
          try {
            const resByLevel = await axios.get(
              `${baseURL}/api/BChartOfAccount/GetChildAccountByLevel?parentId=${BANK_ACCOUNT_PARENT_ID}&accountLevel=4${finalCampusId ? `&campusId=${finalCampusId}` : ''}`
            );
            list = resByLevel?.data?.data || resByLevel?.data || [];
          } catch (e) {
            // Keep list empty if both fail
          }
        }

        const mappedData = (Array.isArray(list) ? list : []).map((item) => {
          const code = item.accountCode || item.code || "";
          const name = item.accountName || item.name || "";
          const label = code && name ? `${code} - ${name}` : (name || code || `Account #${item.id}`);
          return {
            value: item.id,
            label: label
          };
        });

        setOptions([
          { value: "", label: "-- SELECT ACCOUNT --" },
          ...mappedData
        ]);
      } catch (error) {
        setOptions([{ value: "", label: "-- SELECT ACCOUNT --" }]);
      }
    };

    fetchData();
  }, [campusId]);

  return options;
};
