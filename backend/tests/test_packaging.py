from pathlib import Path
import tomllib


def test_pyproject_limits_setuptools_package_discovery_to_backend_only():
    pyproject_path = Path(__file__).resolve().parents[2] / 'pyproject.toml'
    data = tomllib.loads(pyproject_path.read_text())

    packages = data['tool']['setuptools']['packages']['find']
    assert packages['include'] == ['backend', 'backend.*']
    assert 'frontend' not in packages.get('include', [])
    assert 'data' not in packages.get('include', [])
