import ContainerRow from "../components/ContainerRow";
import LastLogin from "../components/LastLogin";
import SettingsForm from "../components/SettingsForm";
import ThirdPartyMigration from "../components/ThirdPartyMigration";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const { isAuth } = useAuth();

  return (
    <div className="settings-page">
      <ContainerRow type="page">
        <div className="col-md-6 offset-md-3 col-xs-12">
          <h1 className="text-xs-center">Your Settings</h1>
          <LastLogin className="text-xs-center" />
          <SettingsForm />
          {isAuth && <ThirdPartyMigration />}
        </div>
      </ContainerRow>
    </div>
  );
}

export default Settings;
