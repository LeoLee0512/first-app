import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from mechanics_mvp.models import *
from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.report import build_report_text,_fmt
class BackendRegressionTests(unittest.TestCase):
 def project(self,nodes=None,loads=(),element_loads=(),kind='frame'):
  return Project(nodes=nodes or (Node('A',0,0,(True,True,True)),Node('B',2,0)),materials=(Material('m',200e9),),sections=(Section('s',.01,8e-5),),elements=(Element('E','A','B','m','s',kind),),nodal_loads=loads,element_loads=element_loads)
 def test_fixed_beam(self):
  r=solve_with_backend(self.project(nodes=(Node('A',0,0,(True,True,True)),Node('B',2,0,(True,True,True))),element_loads=(ElementLoad('E','uniform_local',qy=-1000),)))
  self.assertAlmostEqual(r.reactions['A']['fy'],1000)
  self.assertAlmostEqual(r.reactions['A']['mz'],1000/3)
 def test_mechanism(self):
  with self.assertRaises(RuntimeError): solve_with_backend(self.project(kind='truss',loads=(NodalLoad('B',fx=1000),)))
 def test_nonfinite(self):
  with self.assertRaises(ValueError): solve_with_backend(self.project(loads=(NodalLoad('B',fy=float('inf')),)))
  with self.assertRaises(ValueError): _fmt(float('nan'))
 def test_both_fibres(self):
  p=self.project(loads=(NodalLoad('B',fx=100000,mz=-16000),))
  self.assertIn('20 MPa',build_report_text(p,solve_with_backend(p)))
 def test_point_events(self):
  p=self.project(nodes=(Node('A',0,0,(True,True,False)),Node('B',2,0,(False,True,False))),element_loads=(ElementLoad('E','point_global',ratio=.41,mz=1000),ElementLoad('E','point_global',ratio=.44,mz=-1000)))
  r=solve_with_backend(p)
  self.assertAlmostEqual(max(abs(x['m']) for x in r.element_diagrams['E']),1000)
