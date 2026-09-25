import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CommonSelect3 from "../../../../core/common/commonSelect3";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../../../store";
import useRegionsList from "../../../../core/common/selectoption/master/useRegions";
import { useCampusesList } from "../../../../core/common/selectoption/master/useCampusesList";
import { useBanks } from "../../../../core/common/selectoption/financial/useBank"; // Your custom hook
import { useCampusBankAccount } from "../../../../core/common/selectoption/financial/useCampusBankAccount";
import { CampusBankType, AddBankCampus, UpdateBankCampus, GetCampusBanksByCampus } from "../../../../store/apps/campus-bank";
import toast from 'react-hot-toast'

interface CampusBankModalProps {
  isEditData: CampusBankType | null;
}

const CampusBankModel: React.FC<CampusBankModalProps> = ({ isEditData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const regionsList = useRegionsList();
  const bankOptions = useBanks(); // Hook to get {id, name}
  
  const { data: existingData, loading } = useSelector((state: RootState) => state.campusBank);
  const userInfo = JSON.parse(localStorage.getItem("userData") || "{}")?.data;

  const [regionId, setRegionId] = useState(userInfo?.userLevel === 2 ? userInfo?.userLevelId : null);
  const campuses = useCampusesList(userInfo?.userLevel === 2 ? userInfo?.userLevelId : regionId);

  const initialFormState: CampusBankType = {
    id: 0,
    campusId: userInfo?.userLevel === 3 ? userInfo?.userLevelId : 0,
    bankId: 0,
    accountId: 0,
    accountTitle: "",
    iban: "",
    isDefaultForFeeInvoice: false
  };

  const [formData, setFormData] = useState<CampusBankType>(initialFormState);
  const accountOptions = useCampusBankAccount(formData.campusId);

  // Sync state when editing
  useEffect(() => {
    if (isEditData) {
      const isDefault = (isEditData as any).isDefaultForFeeInvoice === true || 
                        (isEditData as any).isDefaultForFeeInvoice === 1 || 
                        (isEditData as any).isDefaultForFeeInvoice === "true" ||
                        (isEditData as any).isDefaultForFeeInvoice === "1";
      setFormData({
        id: isEditData.id ?? 0,
        campusId: isEditData.campusId ?? 0,
        bankId: isEditData.bankId ?? 0,
        accountId: isEditData.accountId ?? 0,
        accountTitle: isEditData.accountTitle ?? "",
        iban: isEditData.iban ?? "",
        isDefaultForFeeInvoice: isDefault
      });
    } else {
      setFormData(initialFormState);
    }
  }, [isEditData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof CampusBankType, opt: any) => {
    setFormData(prev => ({ ...prev, [name]: opt.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Basic Validation
    if (!formData.campusId || !formData.bankId || !formData.accountTitle) {
      toast.error("Please fill in all required fields");
      return;
    }

    // 2. Duplicate Check (Only for NEW entries)
    if (!isEditData) {
      const isDuplicate = existingData.some(
        (item) =>
          item.campusId === formData.campusId && item.bankId === formData.bankId
      );

      if (isDuplicate) {
        toast.error("This bank account is already registered for this campus.");
        return;
      }
    }

    // 3. Proceed with Dispatch
    try {
      if (formData.id && formData.id > 0) {
        await dispatch(UpdateBankCampus(formData)).unwrap();
      } else {
        await dispatch(AddBankCampus(formData)).unwrap();
      }

      if (formData.campusId) {
        dispatch(GetCampusBanksByCampus(formData.campusId));
      }

      const closeBtn = document.querySelector<HTMLButtonElement>(".modal.show .btn-close");
      closeBtn?.click();
    } catch (error: any) {
      toast.error(error?.message || "Operation failed");
    }
  };

  return (
    <div className="modal fade" id="campus_bank_modal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">{isEditData ? "Edit" : "Add"} Campus Bank</h4>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close">
              <i className="ti ti-x" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                {/* Region Selection (Only for Admin) */}
                {userInfo?.userLevel === 1 && (
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Region</label>
                    <CommonSelect3
                      options={regionsList}
                      onChange={(opt: any) => setRegionId(opt.value)}
                      value={regionsList.find((r: any) => Number(r.value) === Number(regionId))}
                    />
                  </div>
                )}

                {/* Campus Selection */}
                {userInfo?.userLevel <= 2 && (
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Campus</label>
                    <CommonSelect3
                      options={campuses}
                      onChange={(opt: any) => handleSelectChange('campusId', opt)}
                      value={campuses.find((c: any) => Number(c.value) === Number(formData.campusId))}
                    />
                  </div>
                )}

                {/* Bank Selection */}
                <div className="col-md-12 mb-3">
                  <label className="form-label">Select Bank</label>
                  <CommonSelect3
                    options={bankOptions}
                    onChange={(opt: any) => handleSelectChange('bankId', opt)}
                    value={bankOptions.find((b: any) => Number(b.value) === Number(formData.bankId))}
                  />
                </div>

                {/* 4th Level Account Head (COA Bank Account) */}
                <div className="col-md-12 mb-3">
                  <label className="form-label">Account Head (4th Level Bank)</label>
                  <CommonSelect3
                    options={accountOptions}
                    onChange={(opt: any) => handleSelectChange('accountId', opt)}
                    value={accountOptions.find((a: any) => Number(a.value) === Number(formData.accountId))}
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">Account Title</label>
                  <input
                    type="text"
                    name="accountTitle"
                    className="form-control"
                    value={formData.accountTitle}
                    onChange={handleInputChange}
                    placeholder="Enter Account Title"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">IBAN</label>
                  <input
                    type="text"
                    name="iban"
                    className="form-control"
                    value={formData.iban}
                    onChange={handleInputChange}
                    placeholder="Enter IBAN"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <div className="form-check form-switch d-flex align-items-center">
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      id={`isDefaultForFeeInvoice_${isEditData ? 'edit' : 'add'}`}
                      name="isDefaultForFeeInvoice"
                      checked={Boolean(formData.isDefaultForFeeInvoice)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isDefaultForFeeInvoice: e.target.checked
                        }))
                      }
                    />
                    <label className="form-check-label fw-medium cursor-pointer" htmlFor={`isDefaultForFeeInvoice_${isEditData ? 'edit' : 'add'}`}>
                      Default for Fee Invoice
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : isEditData ? "Update Bank" : "Add Bank"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CampusBankModel;